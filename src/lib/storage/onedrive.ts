/**
 * OneDrive provider using Microsoft Graph REST API (pure fetch — no extra SDK).
 * Supports both personal accounts (tenant="common") and business (tenant=tenantId).
 */
import { Readable } from "stream";
import type { FolderNode, OneDriveCredentials, StorageProvider } from "./types";
import { db } from "@/lib/db";
import { encrypt, decrypt } from "@/lib/encrypt";

const GRAPH = "https://graph.microsoft.com/v1.0";

function validatePath(p: string) {
  if (p.includes("..")) throw new Error(`Ongeldig pad: ${p}`);
}

async function refreshIfNeeded(
  creds: OneDriveCredentials
): Promise<OneDriveCredentials> {
  if (!creds.expiresAt || Date.now() < creds.expiresAt - 60_000) return creds;

  const tenant = creds.tenantId || "common";
  const res = await fetch(
    `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: creds.clientId,
        client_secret: creds.clientSecret,
        refresh_token: creds.refreshToken!,
        grant_type: "refresh_token",
        scope: "https://graph.microsoft.com/Files.ReadWrite offline_access",
      }),
    }
  );
  if (!res.ok) throw new Error("OneDrive token refresh mislukt");
  const json = (await res.json()) as {
    access_token: string;
    refresh_token?: string;
    expires_in: number;
  };

  const updated: OneDriveCredentials = {
    ...creds,
    accessToken: json.access_token,
    refreshToken: json.refresh_token ?? creds.refreshToken,
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

export class OneDriveProvider implements StorageProvider {
  readonly type = "onedrive";
  private creds: OneDriveCredentials;

  constructor(creds: OneDriveCredentials) {
    this.creds = creds;
  }

  private get root(): string {
    return this.creds.rootFolderPath ?? "root:/De Leo Content Hub:";
  }

  private async headers(): Promise<Record<string, string>> {
    this.creds = await refreshIfNeeded(this.creds);
    return { Authorization: `Bearer ${this.creds.accessToken}` };
  }

  /** Drive path for a client file: "root:/De Leo Content Hub/slug/rel:" */
  private drivePath(clientSlug: string, relativePath?: string): string {
    const base = `${this.root}/${clientSlug}`;
    return relativePath ? `${base}/${relativePath}:` : `${base}:`;
  }

  private async graphFetch(
    url: string,
    init?: RequestInit
  ): Promise<Response> {
    const h = await this.headers();
    const res = await fetch(url, {
      ...init,
      headers: { ...h, ...(init?.headers ?? {}) },
    });
    return res;
  }

  async saveFile(
    clientSlug: string,
    relativePath: string,
    buffer: Buffer,
    mimeType: string
  ): Promise<void> {
    validatePath(relativePath);
    const itemPath = this.drivePath(clientSlug, relativePath);
    // Use simple upload for files ≤4MB, upload session for larger
    if (buffer.length <= 4 * 1024 * 1024) {
      const res = await this.graphFetch(
        `${GRAPH}/me/drive/${itemPath}/content`,
        {
          method: "PUT",
          headers: { "Content-Type": mimeType },
          body: buffer as unknown as BodyInit,
        }
      );
      if (!res.ok) throw new Error(`OneDrive upload mislukt: ${res.status}`);
    } else {
      // Large file: create upload session
      const sessionRes = await this.graphFetch(
        `${GRAPH}/me/drive/${itemPath}/createUploadSession`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ item: { "@microsoft.graph.conflictBehavior": "replace" } }),
        }
      );
      if (!sessionRes.ok) throw new Error("Upload sessie aanmaken mislukt");
      const { uploadUrl } = (await sessionRes.json()) as { uploadUrl: string };
      const chunkSize = 10 * 1024 * 1024; // 10 MB
      let offset = 0;
      while (offset < buffer.length) {
        const chunk = buffer.subarray(offset, offset + chunkSize);
        const res = await fetch(uploadUrl, {
          method: "PUT",
          headers: {
            "Content-Length": chunk.length.toString(),
            "Content-Range": `bytes ${offset}-${offset + chunk.length - 1}/${buffer.length}`,
          },
          body: chunk as unknown as BodyInit,
        });
        if (!res.ok && res.status !== 202) {
          throw new Error(`OneDrive chunk upload mislukt: ${res.status}`);
        }
        offset += chunk.length;
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
    // Get download URL via metadata
    const itemPath = this.drivePath(clientSlug, relativePath);
    const metaRes = await this.graphFetch(
      `${GRAPH}/me/drive/${itemPath}?select=@microsoft.graph.downloadUrl`
    );
    if (!metaRes.ok) throw new Error("Bestand niet gevonden in OneDrive");
    const meta = (await metaRes.json()) as {
      "@microsoft.graph.downloadUrl": string;
    };
    const dlUrl = meta["@microsoft.graph.downloadUrl"];
    const dlRes = await fetch(dlUrl);
    if (!dlRes.ok) throw new Error("OneDrive download mislukt");
    return Buffer.from(await dlRes.arrayBuffer());
  }

  async deleteFile(clientSlug: string, relativePath: string): Promise<void> {
    validatePath(relativePath);
    const itemPath = this.drivePath(clientSlug, relativePath);
    const res = await this.graphFetch(
      `${GRAPH}/me/drive/${itemPath}`,
      { method: "DELETE" }
    );
    if (!res.ok && res.status !== 404) {
      throw new Error(`OneDrive verwijderen mislukt: ${res.status}`);
    }
  }

  async moveFile(
    clientSlug: string,
    oldPath: string,
    newPath: string
  ): Promise<void> {
    validatePath(oldPath);
    validatePath(newPath);
    const srcPath = this.drivePath(clientSlug, oldPath);
    const newParts = newPath.split("/");
    const newName = newParts.pop()!;
    const newFolder = this.drivePath(clientSlug, newParts.join("/"));

    // Get destination folder ID
    const folderRes = await this.graphFetch(`${GRAPH}/me/drive/${newFolder}?select=id`);
    if (!folderRes.ok) throw new Error("Doelmap niet gevonden in OneDrive");
    const { id: parentId } = (await folderRes.json()) as { id: string };

    const res = await this.graphFetch(`${GRAPH}/me/drive/${srcPath}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: newName,
        parentReference: { id: parentId },
      }),
    });
    if (!res.ok) throw new Error(`OneDrive verplaatsen mislukt: ${res.status}`);
  }

  async fileExists(clientSlug: string, relativePath: string): Promise<boolean> {
    validatePath(relativePath);
    const itemPath = this.drivePath(clientSlug, relativePath);
    const res = await this.graphFetch(
      `${GRAPH}/me/drive/${itemPath}?select=id`
    );
    return res.ok;
  }

  async createClientFolders(
    clientSlug: string,
    folders: string[]
  ): Promise<void> {
    // OneDrive creates intermediate folders automatically on upload.
    // We explicitly create the leaves to ensure the structure exists.
    for (const folder of folders) {
      const itemPath = this.drivePath(clientSlug, folder);
      await this.graphFetch(`${GRAPH}/me/drive/${itemPath}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ folder: {}, "@microsoft.graph.conflictBehavior": "replace" }),
      });
    }
  }

  async deleteClientFolders(clientSlug: string): Promise<void> {
    const itemPath = this.drivePath(clientSlug);
    await this.graphFetch(`${GRAPH}/me/drive/${itemPath}`, { method: "DELETE" });
  }

  async listFolders(clientSlug: string): Promise<FolderNode[]> {
    const headers = await this.headers();

    async function listChildren(
      itemUrl: string,
      relBase: string
    ): Promise<FolderNode[]> {
      const res = await fetch(
        `${itemUrl}/children?$filter=folder ne null&$select=name,id`,
        { headers }
      );
      if (!res.ok) return [];
      const data = (await res.json()) as { value: { id: string; name: string }[] };
      const nodes: FolderNode[] = [];
      for (const item of data.value ?? []) {
        const relPath = relBase ? `${relBase}/${item.name}` : item.name;
        nodes.push({
          name: item.name,
          path: relPath,
          children: await listChildren(
            `${GRAPH}/me/drive/items/${item.id}`,
            relPath
          ),
        });
      }
      return nodes.sort((a, b) => a.name.localeCompare(b.name));
    }

    try {
      const clientPath = this.drivePath(clientSlug);
      const metaRes = await this.graphFetch(
        `${GRAPH}/me/drive/${clientPath}?select=id`
      );
      if (!metaRes.ok) return [];
      const { id } = (await metaRes.json()) as { id: string };
      return listChildren(`${GRAPH}/me/drive/items/${id}`, "");
    } catch {
      return [];
    }
  }
}
