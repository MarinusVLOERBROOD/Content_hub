import { db } from "@/lib/db";
import { getStorageProvider } from "@/lib/storage";

// ── Path helpers (still useful for the local provider) ───────────────────────

export function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

// ── Folder template ──────────────────────────────────────────────────────────

export const DEFAULT_FOLDER_TEMPLATE: string[] = [
  "Content/Branding",
  "Content/Foto/{jaar}",
  "Content/Foto/{vorigjaar}",
  "Content/Video/{jaar}",
  "Content/Video/{vorigjaar}",
  "Documentatie/Inventarisatie",
  "Documentatie/Social-media teksten",
  "Documentatie/Webteksten",
];

export function expandYearPlaceholders(templatePath: string): string {
  const currentYear = new Date().getFullYear().toString();
  const previousYear = (new Date().getFullYear() - 1).toString();
  return templatePath
    .replace(/\{jaar\}/g, currentYear)
    .replace(/\{vorigjaar\}/g, previousYear);
}

interface StoredTreeNode {
  id: string;
  name: string;
  children: StoredTreeNode[];
}

function treeToLeafPaths(nodes: StoredTreeNode[], prefix = ""): string[] {
  return nodes.flatMap((n) => {
    const p = prefix ? `${prefix}/${n.name}` : n.name;
    return n.children.length === 0 ? [p] : treeToLeafPaths(n.children, p);
  });
}

/** Returns resolved flat paths from DB template (with years expanded). */
export async function getCanonicalFolders(): Promise<string[]> {
  let rawPaths: string[] = DEFAULT_FOLDER_TEMPLATE;

  try {
    const setting = await db.appSetting.findUnique({
      where: { key: "folder_template" },
    });
    if (setting) {
      const parsed = JSON.parse(setting.value);
      if (Array.isArray(parsed) && parsed.length > 0) {
        if (typeof parsed[0] === "string") {
          rawPaths = parsed as string[];
        } else {
          rawPaths = treeToLeafPaths(parsed as StoredTreeNode[]);
        }
      }
    }
  } catch {
    // fall through to default
  }

  return rawPaths.map(expandYearPlaceholders);
}

// ── Client folder operations (delegated to active provider) ──────────────────

export async function createClientFolders(clientSlug: string): Promise<void> {
  const folders = await getCanonicalFolders();
  const provider = await getStorageProvider();
  await provider.createClientFolders(clientSlug, folders);
}

export async function deleteClientFolders(clientSlug: string): Promise<void> {
  const provider = await getStorageProvider();
  await provider.deleteClientFolders(clientSlug);
}

// ── FolderNode type (re-exported for API routes) ─────────────────────────────

export type { FolderNode } from "@/lib/storage/types";

export async function getClientFolderTree(clientSlug: string) {
  const provider = await getStorageProvider();

  // For the local provider: lazily bootstrap the full folder structure on first
  // access, and ensure current-year folders exist on subsequent visits.
  if (provider.type === "local") {
    const canonical = await getCanonicalFolders();
    const existing = await provider.listFolders(clientSlug);

    if (existing.length === 0) {
      // First access — create the full template
      await provider.createClientFolders(clientSlug, canonical);
    } else {
      // Ensure current-year folders exist (they change each January)
      const currentYear = new Date().getFullYear().toString();
      const yearFolders = canonical.filter((f) => f.includes(currentYear));
      if (yearFolders.length > 0) {
        await provider.createClientFolders(clientSlug, yearFolders);
      }
    }
  }

  return provider.listFolders(clientSlug);
}

// ── Kept for backward-compat in API routes that still use it ─────────────────

import path from "path";
import fs from "fs";

const UPLOAD_DIR = process.env.UPLOAD_DIR ?? "./uploads";

export function getUploadDir(): string {
  return path.resolve(process.cwd(), UPLOAD_DIR);
}

export function getClientDir(clientSlug: string): string {
  return path.join(getUploadDir(), clientSlug);
}

/**
 * Returns a local filesystem path for a file.
 * Only valid when using the local storage provider.
 * Cloud-aware callers should use the StorageProvider methods directly.
 */
export function getFilePath(clientSlug: string, relativePath: string): string {
  return path.join(getClientDir(clientSlug), relativePath);
}
