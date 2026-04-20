import { Readable } from "stream";
import { Storage } from "megajs";
import type { FolderNode, MegaCredentials, StorageProvider } from "./types";

function validatePath(p: string) {
  if (p.includes("..")) throw new Error(`Ongeldig pad: ${p}`);
}

type MegaFile = {
  name: string;
  directory: boolean;
  children?: MegaFile[];
  upload: (opts: { name: string }) => {
    end: (buf: Buffer) => void;
    on: (event: string, cb: (result: MegaFile) => void) => void;
  };
  download: () => Readable;
  delete: (permanent: boolean, cb: (err?: Error) => void) => void;
};

type MegaStorage = {
  root: MegaFile;
  ready: boolean;
  on: (event: string, cb: () => void) => void;
  mkdir: (name: string, parent: MegaFile) => Promise<MegaFile>;
};

async function openStorage(email: string, password: string): Promise<MegaStorage> {
  return new Promise((resolve, reject) => {
    const storage = new Storage({ email, password }) as unknown as MegaStorage;
    storage.on("ready", () => resolve(storage));
    storage.on("error", reject);
  });
}

async function findOrCreateFolder(
  storage: MegaStorage,
  parent: MegaFile,
  name: string
): Promise<MegaFile> {
  const existing = (parent.children ?? []).find(
    (c) => c.directory && c.name === name
  );
  if (existing) return existing;
  return storage.mkdir(name, parent);
}


function findFile(folder: MegaFile, name: string): MegaFile | null {
  return (folder.children ?? []).find((c) => !c.directory && c.name === name) ?? null;
}

async function uploadToFolder(folder: MegaFile, name: string, buf: Buffer): Promise<void> {
  return new Promise((resolve, reject) => {
    const upload = folder.upload({ name });
    upload.on("complete", () => resolve());
    upload.on("error", reject);
    upload.end(buf);
  });
}

async function deleteNode(node: MegaFile): Promise<void> {
  return new Promise((resolve, reject) => {
    node.delete(true, (err) => (err ? reject(err) : resolve()));
  });
}

function buildFolderTree(folder: MegaFile, relBase: string): FolderNode[] {
  return (folder.children ?? [])
    .filter((c) => c.directory)
    .map((c) => {
      const relPath = relBase ? `${relBase}/${c.name}` : c.name;
      return { name: c.name, path: relPath, children: buildFolderTree(c, relPath) };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

export class MegaProvider implements StorageProvider {
  readonly type = "mega";
  private creds: MegaCredentials;

  constructor(creds: MegaCredentials) {
    this.creds = creds;
  }

  private get rootFolderName(): string {
    return this.creds.rootFolderName ?? "De Leo Content Hub";
  }

  private async getClientFolder(
    storage: MegaStorage,
    clientSlug: string
  ): Promise<MegaFile> {
    const rootFolder = await findOrCreateFolder(
      storage,
      storage.root,
      this.rootFolderName
    );
    return findOrCreateFolder(storage, rootFolder, clientSlug);
  }

  private async resolveFileParts(relativePath: string): Promise<{
    dirs: string[];
    fileName: string;
  }> {
    const parts = relativePath.split("/").filter(Boolean);
    const fileName = parts.pop()!;
    return { dirs: parts, fileName };
  }

  async saveFile(
    clientSlug: string,
    relativePath: string,
    buffer: Buffer
  ): Promise<void> {
    validatePath(relativePath);
    const storage = await openStorage(this.creds.email, this.creds.password);
    const clientFolder = await this.getClientFolder(storage, clientSlug);
    const { dirs, fileName } = await this.resolveFileParts(relativePath);
    let folder = clientFolder;
    for (const dir of dirs) {
      folder = await findOrCreateFolder(storage, folder, dir);
    }
    // Remove existing file if present
    const existing = findFile(folder, fileName);
    if (existing) await deleteNode(existing);
    await uploadToFolder(folder, fileName, buffer);
  }

  async createReadStream(
    clientSlug: string,
    relativePath: string
  ): Promise<Readable> {
    validatePath(relativePath);
    const storage = await openStorage(this.creds.email, this.creds.password);
    const clientFolder = await this.getClientFolder(storage, clientSlug);
    const { dirs, fileName } = await this.resolveFileParts(relativePath);
    let folder = clientFolder;
    for (const dir of dirs) {
      const found = (folder.children ?? []).find(
        (c) => c.directory && c.name === dir
      );
      if (!found) throw new Error("Map niet gevonden in MEGA");
      folder = found;
    }
    const file = findFile(folder, fileName);
    if (!file) throw new Error("Bestand niet gevonden in MEGA");
    return file.download();
  }

  async readBuffer(clientSlug: string, relativePath: string): Promise<Buffer> {
    const stream = await this.createReadStream(clientSlug, relativePath);
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      stream.on("data", (c: Buffer) => chunks.push(c));
      stream.on("end", () => resolve(Buffer.concat(chunks)));
      stream.on("error", reject);
    });
  }

  async deleteFile(clientSlug: string, relativePath: string): Promise<void> {
    validatePath(relativePath);
    try {
      const storage = await openStorage(this.creds.email, this.creds.password);
      const clientFolder = await this.getClientFolder(storage, clientSlug);
      const { dirs, fileName } = await this.resolveFileParts(relativePath);
      let folder = clientFolder;
      for (const dir of dirs) {
        const found = (folder.children ?? []).find(
          (c) => c.directory && c.name === dir
        );
        if (!found) return;
        folder = found;
      }
      const file = findFile(folder, fileName);
      if (file) await deleteNode(file);
    } catch {
      // already gone
    }
  }

  async moveFile(
    clientSlug: string,
    oldPath: string,
    newPath: string
  ): Promise<void> {
    // MEGA SDK doesn't have move — download then re-upload
    const buf = await this.readBuffer(clientSlug, oldPath);
    await this.saveFile(clientSlug, newPath, buf);
    await this.deleteFile(clientSlug, oldPath);
  }

  async fileExists(clientSlug: string, relativePath: string): Promise<boolean> {
    try {
      const storage = await openStorage(this.creds.email, this.creds.password);
      const clientFolder = await this.getClientFolder(storage, clientSlug);
      const { dirs, fileName } = await this.resolveFileParts(relativePath);
      let folder = clientFolder;
      for (const dir of dirs) {
        const found = (folder.children ?? []).find(
          (c) => c.directory && c.name === dir
        );
        if (!found) return false;
        folder = found;
      }
      return findFile(folder, fileName) !== null;
    } catch {
      return false;
    }
  }

  async createClientFolders(
    clientSlug: string,
    folders: string[]
  ): Promise<void> {
    const storage = await openStorage(this.creds.email, this.creds.password);
    const clientFolder = await this.getClientFolder(storage, clientSlug);
    for (const folderPath of folders) {
      let current = clientFolder;
      for (const part of folderPath.split("/").filter(Boolean)) {
        current = await findOrCreateFolder(storage, current, part);
      }
    }
  }

  async deleteClientFolders(clientSlug: string): Promise<void> {
    try {
      const storage = await openStorage(this.creds.email, this.creds.password);
      const rootFolder = await findOrCreateFolder(
        storage,
        storage.root,
        this.rootFolderName
      );
      const clientFolder = (rootFolder.children ?? []).find(
        (c) => c.directory && c.name === clientSlug
      );
      if (clientFolder) await deleteNode(clientFolder);
    } catch {
      // already gone
    }
  }

  async listFolders(clientSlug: string): Promise<FolderNode[]> {
    try {
      const storage = await openStorage(this.creds.email, this.creds.password);
      const clientFolder = await this.getClientFolder(storage, clientSlug);
      return buildFolderTree(clientFolder, "");
    } catch {
      return [];
    }
  }
}
