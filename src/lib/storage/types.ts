import type { Readable } from "stream";

export interface FolderNode {
  name: string;
  path: string; // relative to client root
  children: FolderNode[];
}

/**
 * Abstraction over any storage backend.
 * All paths are relative to the client root:
 *   clientSlug  = the client identifier (slug)
 *   relativePath = e.g. "Content/Foto/2026/photo.jpg"
 *
 * Implementations must NEVER allow path traversal (.., absolute paths).
 */
export interface StorageProvider {
  readonly type: string;

  // ── File operations ──────────────────────────────────────────────────────

  /** Write (or overwrite) a file. */
  saveFile(
    clientSlug: string,
    relativePath: string,
    buffer: Buffer,
    mimeType: string
  ): Promise<void>;

  /** Stream a file — used for download and preview responses. */
  createReadStream(
    clientSlug: string,
    relativePath: string
  ): Promise<Readable>;

  /** Read entire file into memory — used for ZIP creation. */
  readBuffer(clientSlug: string, relativePath: string): Promise<Buffer>;

  /** Delete a file. Should NOT throw if the file is already gone. */
  deleteFile(clientSlug: string, relativePath: string): Promise<void>;

  /** Move / rename a file within the same client's storage. */
  moveFile(
    clientSlug: string,
    oldPath: string,
    newPath: string
  ): Promise<void>;

  /** Returns true if the file exists. */
  fileExists(clientSlug: string, relativePath: string): Promise<boolean>;

  // ── Folder operations ────────────────────────────────────────────────────

  /** Create all folders in `folders` (resolved leaf paths) for a new client. */
  createClientFolders(clientSlug: string, folders: string[]): Promise<void>;

  /** Recursively delete everything for a client. */
  deleteClientFolders(clientSlug: string): Promise<void>;

  /** Return the folder tree for a client (no files, only directories). */
  listFolders(clientSlug: string): Promise<FolderNode[]>;
}

// ── Credential shapes ────────────────────────────────────────────────────────

export type ProviderType =
  | "local"
  | "google-drive"
  | "onedrive"
  | "dropbox"
  | "mega";

export interface LocalCredentials {
  uploadDir?: string; // defaults to UPLOAD_DIR env var
}

export interface GoogleDriveCredentials {
  clientId: string;
  clientSecret: string;
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: number; // unix ms
  rootFolderId?: string; // ID of the root folder in Drive
}

export interface OneDriveCredentials {
  clientId: string;
  clientSecret: string;
  tenantId: string; // "common" for personal, tenant ID for business
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: number;
  rootFolderPath?: string; // e.g. "root:/Content Hub:" — defaults to App root
}

export interface DropboxCredentials {
  appKey: string;
  appSecret: string;
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: number;
  rootPath?: string; // e.g. "/Content Hub" — defaults to app root
}

export interface MegaCredentials {
  email: string;
  password: string; // stored encrypted
  rootFolderName?: string; // defaults to "De Leo Content Hub"
}

export type ProviderCredentials =
  | LocalCredentials
  | GoogleDriveCredentials
  | OneDriveCredentials
  | DropboxCredentials
  | MegaCredentials;

/** Shape stored in AppSetting as encrypted JSON */
export interface StorageConfig {
  type: ProviderType;
  credentials: ProviderCredentials;
}
