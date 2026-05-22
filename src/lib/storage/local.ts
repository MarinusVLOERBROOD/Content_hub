import fs from "fs";
import path from "path";
import { Readable } from "stream";
import type { FolderNode, StorageProvider } from "./types";

function validatePath(p: string) {
  if (p.includes("..") || path.isAbsolute(p)) {
    throw new Error(`Ongeldig bestandspad: ${p}`);
  }
}

function getUploadDir(uploadDir?: string): string {
  const dir = uploadDir ?? process.env.UPLOAD_DIR ?? "./uploads";
  return path.resolve(process.cwd(), dir);
}

function clientDir(uploadDir: string | undefined, clientSlug: string) {
  validatePath(clientSlug);
  return path.join(getUploadDir(uploadDir), clientSlug);
}

function filePath(
  uploadDir: string | undefined,
  clientSlug: string,
  relativePath: string
) {
  validatePath(relativePath);
  return path.join(clientDir(uploadDir, clientSlug), relativePath);
}

async function buildTree(dir: string, relBase: string): Promise<FolderNode[]> {
  let entries: fs.Dirent[];
  try {
    entries = await fs.promises.readdir(dir, { withFileTypes: true });
  } catch {
    return [];
  }
  const nodes: FolderNode[] = [];
  for (const entry of entries) {
    if (entry.isDirectory()) {
      const relPath = relBase ? `${relBase}/${entry.name}` : entry.name;
      nodes.push({
        name: entry.name,
        path: relPath,
        children: await buildTree(path.join(dir, entry.name), relPath),
      });
    }
  }
  return nodes.sort((a, b) => a.name.localeCompare(b.name));
}

export class LocalStorageProvider implements StorageProvider {
  readonly type = "local";
  private uploadDir?: string;

  constructor(uploadDir?: string) {
    this.uploadDir = uploadDir;
  }

  async saveFile(
    clientSlug: string,
    relativePath: string,
    buffer: Buffer
  ): Promise<void> {
    const fp = filePath(this.uploadDir, clientSlug, relativePath);
    await fs.promises.mkdir(path.dirname(fp), { recursive: true });
    await fs.promises.writeFile(fp, buffer);
  }

  async createReadStream(
    clientSlug: string,
    relativePath: string
  ): Promise<Readable> {
    const fp = filePath(this.uploadDir, clientSlug, relativePath);
    return fs.createReadStream(fp);
  }

  async readBuffer(clientSlug: string, relativePath: string): Promise<Buffer> {
    const fp = filePath(this.uploadDir, clientSlug, relativePath);
    return fs.promises.readFile(fp);
  }

  async deleteFile(clientSlug: string, relativePath: string): Promise<void> {
    const fp = filePath(this.uploadDir, clientSlug, relativePath);
    try {
      await fs.promises.unlink(fp);
    } catch {
      // already gone
    }
  }

  async moveFile(
    clientSlug: string,
    oldPath: string,
    newPath: string
  ): Promise<void> {
    const src = filePath(this.uploadDir, clientSlug, oldPath);
    const dst = filePath(this.uploadDir, clientSlug, newPath);
    await fs.promises.mkdir(path.dirname(dst), { recursive: true });
    await fs.promises.rename(src, dst);
  }

  async fileExists(clientSlug: string, relativePath: string): Promise<boolean> {
    const fp = filePath(this.uploadDir, clientSlug, relativePath);
    try {
      await fs.promises.access(fp);
      return true;
    } catch {
      return false;
    }
  }

  async createClientFolders(
    clientSlug: string,
    folders: string[]
  ): Promise<void> {
    for (const folder of folders) {
      const fp = path.join(clientDir(this.uploadDir, clientSlug), folder);
      await fs.promises.mkdir(fp, { recursive: true });
    }
  }

  async deleteClientFolders(clientSlug: string): Promise<void> {
    const dir = clientDir(this.uploadDir, clientSlug);
    try {
      await fs.promises.rm(dir, { recursive: true, force: true });
    } catch {
      // already gone
    }
  }

  async listFolders(clientSlug: string): Promise<FolderNode[]> {
    return buildTree(clientDir(this.uploadDir, clientSlug), "");
  }

  /** Returns the absolute filesystem path — only used internally. */
  getAbsolutePath(clientSlug: string, relativePath: string): string {
    return filePath(this.uploadDir, clientSlug, relativePath);
  }
}
