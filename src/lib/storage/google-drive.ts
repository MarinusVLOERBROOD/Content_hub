import { Readable } from "stream";
import { google, drive_v3 } from "googleapis";
import type { FolderNode, GoogleDriveCredentials, StorageProvider } from "./types";
import { db } from "@/lib/db";
import { encrypt, decrypt } from "@/lib/encrypt";

const FOLDER_MIME = "application/vnd.google-apps.folder";

function validatePath(p: string) {
  if (p.includes("..")) throw new Error(`Ongeldig pad: ${p}`);
}

async function refreshIfNeeded(
  creds: GoogleDriveCredentials
): Promise<GoogleDriveCredentials> {
  if (!creds.expiresAt || Date.now() < creds.expiresAt - 60_000) return creds;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: creds.clientId,
      client_secret: creds.clientSecret,
      refresh_token: creds.refreshToken!,
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) throw new Error("Google token refresh mislukt");
  const json = (await res.json()) as {
    access_token: string;
    expires_in: number;
  };

  const updated: GoogleDriveCredentials = {
    ...creds,
    accessToken: json.access_token,
    expiresAt: Date.now() + json.expires_in * 1000,
  };

  // Persist refreshed token
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

export class GoogleDriveProvider implements StorageProvider {
  readonly type = "google-drive";
  private creds: GoogleDriveCredentials;

  constructor(creds: GoogleDriveCredentials) {
    this.creds = creds;
  }

  private async getDrive(): Promise<drive_v3.Drive> {
    this.creds = await refreshIfNeeded(this.creds);
    const auth = new google.auth.OAuth2(
      this.creds.clientId,
      this.creds.clientSecret
    );
    auth.setCredentials({ access_token: this.creds.accessToken });
    return google.drive({ version: "v3", auth });
  }

  /** Find or create a folder by name inside a parent. Returns folder ID. */
  private async ensureFolder(
    drive: drive_v3.Drive,
    name: string,
    parentId: string
  ): Promise<string> {
    const q = `name='${name.replace(/'/g, "\\'")}' and mimeType='${FOLDER_MIME}' and '${parentId}' in parents and trashed=false`;
    const list = await drive.files.list({
      q,
      fields: "files(id)",
      spaces: "drive",
    });
    if (list.data.files && list.data.files.length > 0) {
      return list.data.files[0].id!;
    }
    const created = await drive.files.create({
      requestBody: { name, mimeType: FOLDER_MIME, parents: [parentId] },
      fields: "id",
    });
    return created.data.id!;
  }

  /** Resolve a path like "Content/Foto/2026" into a Drive folder ID. */
  private async resolveFolderPath(
    drive: drive_v3.Drive,
    clientSlug: string,
    folderPath: string
  ): Promise<string> {
    const root = this.creds.rootFolderId ?? "root";
    // Ensure client root folder exists
    let current = await this.ensureFolder(drive, clientSlug, root);
    if (!folderPath) return current;
    for (const part of folderPath.split("/")) {
      if (!part) continue;
      current = await this.ensureFolder(drive, part, current);
    }
    return current;
  }

  /** Find a file ID by path. Returns null if not found. */
  private async findFileId(
    drive: drive_v3.Drive,
    clientSlug: string,
    relativePath: string
  ): Promise<string | null> {
    const parts = relativePath.split("/");
    const fileName = parts.pop()!;
    const folderPath = parts.join("/");
    let folderId: string;
    try {
      folderId = await this.resolveFolderPath(drive, clientSlug, folderPath);
    } catch {
      return null;
    }
    const q = `name='${fileName.replace(/'/g, "\\'")}' and '${folderId}' in parents and trashed=false`;
    const list = await drive.files.list({ q, fields: "files(id)", spaces: "drive" });
    return list.data.files?.[0]?.id ?? null;
  }

  async saveFile(
    clientSlug: string,
    relativePath: string,
    buffer: Buffer,
    mimeType: string
  ): Promise<void> {
    validatePath(relativePath);
    const drive = await this.getDrive();
    const parts = relativePath.split("/");
    const fileName = parts.pop()!;
    const folderPath = parts.join("/");
    const folderId = await this.resolveFolderPath(drive, clientSlug, folderPath);

    // Check if file exists (for upsert)
    const existingId = await this.findFileId(drive, clientSlug, relativePath);
    const media = { mimeType, body: Readable.from(buffer) };

    if (existingId) {
      await drive.files.update({ fileId: existingId, media });
    } else {
      await drive.files.create({
        requestBody: { name: fileName, parents: [folderId] },
        media,
        fields: "id",
      });
    }
  }

  async createReadStream(
    clientSlug: string,
    relativePath: string
  ): Promise<Readable> {
    validatePath(relativePath);
    const drive = await this.getDrive();
    const fileId = await this.findFileId(drive, clientSlug, relativePath);
    if (!fileId) throw new Error("Bestand niet gevonden in Google Drive");
    const res = await drive.files.get(
      { fileId, alt: "media" },
      { responseType: "stream" }
    );
    return res.data as Readable;
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
    const drive = await this.getDrive();
    const fileId = await this.findFileId(drive, clientSlug, relativePath);
    if (!fileId) return;
    await drive.files.delete({ fileId });
  }

  async moveFile(
    clientSlug: string,
    oldPath: string,
    newPath: string
  ): Promise<void> {
    validatePath(oldPath);
    validatePath(newPath);
    const drive = await this.getDrive();
    const fileId = await this.findFileId(drive, clientSlug, oldPath);
    if (!fileId) throw new Error("Bronbestand niet gevonden");

    const newParts = newPath.split("/");
    const newName = newParts.pop()!;
    const newFolderPath = newParts.join("/");
    const newFolderId = await this.resolveFolderPath(drive, clientSlug, newFolderPath);

    const oldParts = oldPath.split("/");
    oldParts.pop();
    const oldFolderId = await this.resolveFolderPath(drive, clientSlug, oldParts.join("/"));

    await drive.files.update({
      fileId,
      addParents: newFolderId,
      removeParents: oldFolderId,
      requestBody: { name: newName },
      fields: "id",
    });
  }

  async fileExists(clientSlug: string, relativePath: string): Promise<boolean> {
    const drive = await this.getDrive();
    const id = await this.findFileId(drive, clientSlug, relativePath);
    return id !== null;
  }

  async createClientFolders(
    clientSlug: string,
    folders: string[]
  ): Promise<void> {
    const drive = await this.getDrive();
    for (const folder of folders) {
      await this.resolveFolderPath(drive, clientSlug, folder);
    }
  }

  async deleteClientFolders(clientSlug: string): Promise<void> {
    const drive = await this.getDrive();
    const root = this.creds.rootFolderId ?? "root";
    const q = `name='${clientSlug}' and mimeType='${FOLDER_MIME}' and '${root}' in parents and trashed=false`;
    const list = await drive.files.list({ q, fields: "files(id)" });
    for (const file of list.data.files ?? []) {
      await drive.files.delete({ fileId: file.id! });
    }
  }

  async listFolders(clientSlug: string): Promise<FolderNode[]> {
    const drive = await this.getDrive();
    const root = this.creds.rootFolderId ?? "root";

    async function listChildren(
      parentId: string,
      relBase: string
    ): Promise<FolderNode[]> {
      const q = `mimeType='${FOLDER_MIME}' and '${parentId}' in parents and trashed=false`;
      const list = await drive.files.list({
        q,
        fields: "files(id, name)",
        orderBy: "name",
        spaces: "drive",
      });
      const nodes: FolderNode[] = [];
      for (const f of list.data.files ?? []) {
        const relPath = relBase ? `${relBase}/${f.name}` : f.name!;
        nodes.push({
          name: f.name!,
          path: relPath,
          children: await listChildren(f.id!, relPath),
        });
      }
      return nodes;
    }

    try {
      const clientFolderId = await this.resolveFolderPath(drive, clientSlug, "");
      // Get the actual client folder ID (not root)
      const q = `name='${clientSlug}' and mimeType='${FOLDER_MIME}' and '${root}' in parents and trashed=false`;
      const list = await drive.files.list({ q, fields: "files(id)" });
      const id = list.data.files?.[0]?.id ?? clientFolderId;
      return listChildren(id, "");
    } catch {
      return [];
    }
  }
}
