import { Readable } from "stream";
import { Dropbox } from "dropbox";
import type { FolderNode, DropboxCredentials, StorageProvider } from "./types";
import { db } from "@/lib/db";
import { encrypt, decrypt } from "@/lib/encrypt";

function validatePath(p: string) {
  if (p.includes("..")) throw new Error(`Ongeldig pad: ${p}`);
}

async function refreshIfNeeded(
  creds: DropboxCredentials
): Promise<DropboxCredentials> {
  if (!creds.expiresAt || Date.now() < creds.expiresAt - 60_000) return creds;

  const res = await fetch("https://api.dropboxapi.com/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: creds.appKey,
      client_secret: creds.appSecret,
      refresh_token: creds.refreshToken!,
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) throw new Error("Dropbox token refresh mislukt");
  const json = (await res.json()) as { access_token: string; expires_in: number };

  const updated: DropboxCredentials = {
    ...creds,
    accessToken: json.access_token,
    expiresAt: Date.now() + json.expires_in * 1000,
  };

  const raw = await db.appSetting.findUnique({ where: { key: "storage_config" } });
  if (raw) {
    const cfg = JSON.parse(decrypt(raw.value));
    cfg.credentials = updated;
    await db.appSetting.update({
      where: { key: "storage_config" },
      data: { value: encrypt(JSON.stringify(cfg)) },
    });
  }

  return updated;
}

export class DropboxProvider implements StorageProvider {
  readonly type = "dropbox";
  private creds: DropboxCredentials;

  constructor(creds: DropboxCredentials) {
    this.creds = creds;
  }

  private get rootPath(): string {
    return this.creds.rootPath ?? "/De Leo Content Hub";
  }

  private dbxPath(clientSlug: string, relativePath?: string): string {
    const base = `${this.rootPath}/${clientSlug}`;
    return relativePath ? `${base}/${relativePath}` : base;
  }

  private async dbx(): Promise<Dropbox> {
    this.creds = await refreshIfNeeded(this.creds);
    return new Dropbox({ accessToken: this.creds.accessToken });
  }

  async saveFile(
    clientSlug: string,
    relativePath: string,
    buffer: Buffer,
    _mimeType: string
  ): Promise<void> {
    validatePath(relativePath);
    const dbx = await this.dbx();
    const dbxPath = this.dbxPath(clientSlug, relativePath);

    if (buffer.length <= 150 * 1024 * 1024) {
      // Simple upload ≤150 MB
      await dbx.filesUpload({
        path: dbxPath,
        mode: { ".tag": "overwrite" },
        contents: buffer,
      });
    } else {
      // Upload session for large files
      const chunkSize = 50 * 1024 * 1024;
      const firstChunk = buffer.subarray(0, chunkSize);
      const session = await dbx.filesUploadSessionStart({
        close: false,
        contents: firstChunk,
      });
      const sessionId = session.result.session_id;
      let offset = chunkSize;

      while (offset < buffer.length) {
        const chunk = buffer.subarray(offset, offset + chunkSize);
        const isLast = offset + chunk.length >= buffer.length;
        if (isLast) {
          await dbx.filesUploadSessionFinish({
            cursor: { session_id: sessionId, offset },
            commit: { path: dbxPath, mode: { ".tag": "overwrite" } },
            contents: chunk,
          });
        } else {
          await dbx.filesUploadSessionAppendV2({
            cursor: { session_id: sessionId, offset },
            close: false,
            contents: chunk,
          });
          offset += chunk.length;
        }
        if (isLast) break;
      }
    }
  }

  async createReadStream(
    clientSlug: string,
    relativePath: string
  ): Promise<Readable> {
    const buf = await this.readBuffer(clientSlug, relativePath);
    return Readable.from(buf);
  }

  async readBuffer(clientSlug: string, relativePath: string): Promise<Buffer> {
    validatePath(relativePath);
    const dbx = await this.dbx();
    const res = await dbx.filesGetTemporaryLink({
      path: this.dbxPath(clientSlug, relativePath),
    });
    const dlRes = await fetch(res.result.link);
    if (!dlRes.ok) throw new Error("Dropbox download mislukt");
    return Buffer.from(await dlRes.arrayBuffer());
  }

  async deleteFile(clientSlug: string, relativePath: string): Promise<void> {
    validatePath(relativePath);
    const dbx = await this.dbx();
    try {
      await dbx.filesDeleteV2({ path: this.dbxPath(clientSlug, relativePath) });
    } catch {
      // already gone
    }
  }

  async moveFile(
    clientSlug: string,
    oldPath: string,
    newPath: string
  ): Promise<void> {
    validatePath(oldPath);
    validatePath(newPath);
    const dbx = await this.dbx();
    await dbx.filesMoveV2({
      from_path: this.dbxPath(clientSlug, oldPath),
      to_path: this.dbxPath(clientSlug, newPath),
      autorename: false,
    });
  }

  async fileExists(clientSlug: string, relativePath: string): Promise<boolean> {
    validatePath(relativePath);
    const dbx = await this.dbx();
    try {
      await dbx.filesGetMetadata({
        path: this.dbxPath(clientSlug, relativePath),
      });
      return true;
    } catch {
      return false;
    }
  }

  async createClientFolders(
    clientSlug: string,
    folders: string[]
  ): Promise<void> {
    const dbx = await this.dbx();
    for (const folder of folders) {
      try {
        await dbx.filesCreateFolderV2({
          path: this.dbxPath(clientSlug, folder),
          autorename: false,
        });
      } catch {
        // folder already exists
      }
    }
  }

  async deleteClientFolders(clientSlug: string): Promise<void> {
    const dbx = await this.dbx();
    try {
      await dbx.filesDeleteV2({ path: this.dbxPath(clientSlug) });
    } catch {
      // already gone
    }
  }

  async listFolders(clientSlug: string): Promise<FolderNode[]> {
    const dbx = await this.dbx();

    async function listChildren(
      dbxPath: string,
      relBase: string
    ): Promise<FolderNode[]> {
      try {
        const res = await dbx.filesListFolder({ path: dbxPath });
        const nodes: FolderNode[] = [];
        for (const entry of res.result.entries) {
          if (entry[".tag"] !== "folder") continue;
          const relPath = relBase ? `${relBase}/${entry.name}` : entry.name;
          nodes.push({
            name: entry.name,
            path: relPath,
            children: await listChildren(entry.path_lower!, relPath),
          });
        }
        return nodes.sort((a, b) => a.name.localeCompare(b.name));
      } catch {
        return [];
      }
    }

    return listChildren(this.dbxPath(clientSlug), "");
  }
}
