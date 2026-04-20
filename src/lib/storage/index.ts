import { db } from "@/lib/db";
import { decrypt } from "@/lib/encrypt";
import type { StorageConfig, StorageProvider } from "./types";
import { LocalStorageProvider } from "./local";

// Cache the active provider within a single Node.js process (request-level
// caching is handled by Next.js; this avoids re-reading DB on every call
// within the same server action chain).
let _cachedProvider: StorageProvider | null = null;
let _cachedKey: string | null = null;

/**
 * Returns the active storage provider.
 * Falls back to LocalStorageProvider if no configuration is found.
 */
export async function getStorageProvider(): Promise<StorageProvider> {
  try {
    const setting = await db.appSetting.findUnique({
      where: { key: "storage_config" },
    });
    if (!setting) return new LocalStorageProvider();

    // Use simple cache keyed on the raw encrypted value
    if (_cachedKey === setting.value && _cachedProvider) {
      return _cachedProvider;
    }

    const config: StorageConfig = JSON.parse(decrypt(setting.value));
    let provider: StorageProvider;

    switch (config.type) {
      case "google-drive": {
        const { GoogleDriveProvider: P } = await import("./google-drive");
        provider = new P(config.credentials as ConstructorParameters<typeof P>[0]);
        break;
      }
      case "onedrive": {
        const { OneDriveProvider: P } = await import("./onedrive");
        provider = new P(config.credentials as ConstructorParameters<typeof P>[0]);
        break;
      }
      case "dropbox": {
        const { DropboxProvider: P } = await import("./dropbox");
        provider = new P(config.credentials as ConstructorParameters<typeof P>[0]);
        break;
      }
      case "mega": {
        const { MegaProvider: P } = await import("./mega");
        provider = new P(config.credentials as ConstructorParameters<typeof P>[0]);
        break;
      }
      default:
        provider = new LocalStorageProvider(
          (config.credentials as { uploadDir?: string }).uploadDir
        );
    }

    _cachedProvider = provider;
    _cachedKey = setting.value;
    return provider;
  } catch {
    // If anything goes wrong reading/decrypting config, fall back to local
    return new LocalStorageProvider();
  }
}

/** Invalidate the in-memory cache (call after saving new config). */
export function invalidateStorageCache() {
  _cachedProvider = null;
  _cachedKey = null;
}

export type { StorageProvider, StorageConfig, ProviderType } from "./types";
export { LocalStorageProvider } from "./local";
export { GoogleDriveProvider } from "./google-drive";
export { OneDriveProvider } from "./onedrive";
export { DropboxProvider } from "./dropbox";
export { MegaProvider } from "./mega";
