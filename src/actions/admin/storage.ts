"use server";

import crypto from "crypto";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { encrypt, decrypt } from "@/lib/encrypt";
import { invalidateStorageCache } from "@/lib/storage";
import type {
  ProviderType,
  StorageConfig,
  GoogleDriveCredentials,
  OneDriveCredentials,
  DropboxCredentials,
  MegaCredentials,
} from "@/lib/storage/types";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
const CALLBACK_BASE = `${APP_URL}/api/admin/storage/callback`;

// ── Read current config ───────────────────────────────────────────────────────

export async function getStorageConfig(): Promise<{
  type: ProviderType;
  connected: boolean;
  // Safe (non-secret) fields for UI display
  display: Record<string, string>;
} | null> {
  await requireAdmin();
  const setting = await db.appSetting.findUnique({
    where: { key: "storage_config" },
  });
  if (!setting) return null;

  try {
    const config: StorageConfig = JSON.parse(decrypt(setting.value));
    const display: Record<string, string> = {};
    let connected = false;

    if (config.type === "local") {
      connected = true;
    } else if (config.type === "google-drive") {
      const c = config.credentials as GoogleDriveCredentials;
      display.clientId = c.clientId ? maskSecret(c.clientId) : "";
      connected = !!c.accessToken;
    } else if (config.type === "onedrive") {
      const c = config.credentials as OneDriveCredentials;
      display.clientId = c.clientId ? maskSecret(c.clientId) : "";
      display.tenantId = c.tenantId ?? "common";
      connected = !!c.accessToken;
    } else if (config.type === "dropbox") {
      const c = config.credentials as DropboxCredentials;
      display.appKey = c.appKey ? maskSecret(c.appKey) : "";
      connected = !!c.accessToken;
    } else if (config.type === "mega") {
      const c = config.credentials as MegaCredentials;
      display.email = c.email ?? "";
      connected = !!c.email && !!c.password;
    }

    return { type: config.type, connected, display };
  } catch {
    return null;
  }
}

function maskSecret(s: string): string {
  if (s.length <= 8) return "••••••••";
  return s.slice(0, 4) + "••••••••" + s.slice(-4);
}

// ── Switch to local storage ───────────────────────────────────────────────────

export async function setLocalStorage(): Promise<{ success: true }> {
  await requireAdmin();
  const config: StorageConfig = { type: "local", credentials: {} };
  await db.appSetting.upsert({
    where: { key: "storage_config" },
    update: { value: encrypt(JSON.stringify(config)) },
    create: { key: "storage_config", value: encrypt(JSON.stringify(config)) },
  });
  invalidateStorageCache();
  revalidatePath("/admin/instellingen");
  return { success: true };
}

// ── Google Drive ──────────────────────────────────────────────────────────────

export async function saveGoogleDriveCredentials(data: {
  clientId: string;
  clientSecret: string;
  rootFolderId?: string;
}): Promise<{ authUrl: string }> {
  await requireAdmin();
  if (!data.clientId || !data.clientSecret) {
    throw new Error("Client ID en Client Secret zijn verplicht");
  }

  const config: StorageConfig = {
    type: "google-drive",
    credentials: {
      clientId: data.clientId.trim(),
      clientSecret: data.clientSecret.trim(),
      rootFolderId: data.rootFolderId?.trim() || undefined,
    } satisfies GoogleDriveCredentials,
  };

  await db.appSetting.upsert({
    where: { key: "storage_config" },
    update: { value: encrypt(JSON.stringify(config)) },
    create: { key: "storage_config", value: encrypt(JSON.stringify(config)) },
  });

  // Generate & store CSRF state
  const state = crypto.randomBytes(16).toString("hex");
  await db.appSetting.upsert({
    where: { key: "storage_oauth_state" },
    update: { value: state },
    create: { key: "storage_oauth_state", value: state },
  });

  invalidateStorageCache();

  const params = new URLSearchParams({
    client_id: data.clientId.trim(),
    redirect_uri: `${CALLBACK_BASE}?provider=google-drive`,
    response_type: "code",
    scope: "https://www.googleapis.com/auth/drive.file",
    access_type: "offline",
    prompt: "consent",
    state,
  });

  return { authUrl: `https://accounts.google.com/o/oauth2/v2/auth?${params}` };
}

// ── OneDrive ──────────────────────────────────────────────────────────────────

export async function saveOneDriveCredentials(data: {
  clientId: string;
  clientSecret: string;
  tenantId?: string;
  rootFolderPath?: string;
}): Promise<{ authUrl: string }> {
  await requireAdmin();
  if (!data.clientId || !data.clientSecret) {
    throw new Error("Client ID en Client Secret zijn verplicht");
  }

  const tenant = data.tenantId?.trim() || "common";
  const config: StorageConfig = {
    type: "onedrive",
    credentials: {
      clientId: data.clientId.trim(),
      clientSecret: data.clientSecret.trim(),
      tenantId: tenant,
      rootFolderPath: data.rootFolderPath?.trim() || undefined,
    } satisfies OneDriveCredentials,
  };

  await db.appSetting.upsert({
    where: { key: "storage_config" },
    update: { value: encrypt(JSON.stringify(config)) },
    create: { key: "storage_config", value: encrypt(JSON.stringify(config)) },
  });

  const state = crypto.randomBytes(16).toString("hex");
  await db.appSetting.upsert({
    where: { key: "storage_oauth_state" },
    update: { value: state },
    create: { key: "storage_oauth_state", value: state },
  });

  invalidateStorageCache();

  const params = new URLSearchParams({
    client_id: data.clientId.trim(),
    redirect_uri: `${CALLBACK_BASE}?provider=onedrive`,
    response_type: "code",
    scope: "https://graph.microsoft.com/Files.ReadWrite offline_access",
    state,
  });

  return {
    authUrl: `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/authorize?${params}`,
  };
}

// ── Dropbox ───────────────────────────────────────────────────────────────────

export async function saveDropboxCredentials(data: {
  appKey: string;
  appSecret: string;
  rootPath?: string;
}): Promise<{ authUrl: string }> {
  await requireAdmin();
  if (!data.appKey || !data.appSecret) {
    throw new Error("App Key en App Secret zijn verplicht");
  }

  const config: StorageConfig = {
    type: "dropbox",
    credentials: {
      appKey: data.appKey.trim(),
      appSecret: data.appSecret.trim(),
      rootPath: data.rootPath?.trim() || "/De Leo Content Hub",
    } satisfies DropboxCredentials,
  };

  await db.appSetting.upsert({
    where: { key: "storage_config" },
    update: { value: encrypt(JSON.stringify(config)) },
    create: { key: "storage_config", value: encrypt(JSON.stringify(config)) },
  });

  const state = crypto.randomBytes(16).toString("hex");
  await db.appSetting.upsert({
    where: { key: "storage_oauth_state" },
    update: { value: state },
    create: { key: "storage_oauth_state", value: state },
  });

  invalidateStorageCache();

  const params = new URLSearchParams({
    client_id: data.appKey.trim(),
    redirect_uri: `${CALLBACK_BASE}?provider=dropbox`,
    response_type: "code",
    token_access_type: "offline",
    state,
  });

  return {
    authUrl: `https://www.dropbox.com/oauth2/authorize?${params}`,
  };
}

// ── MEGA ──────────────────────────────────────────────────────────────────────

export async function saveMegaCredentials(data: {
  email: string;
  password: string;
  rootFolderName?: string;
}): Promise<{ success: true } | { error: string }> {
  await requireAdmin();
  if (!data.email || !data.password) {
    return { error: "E-mailadres en wachtwoord zijn verplicht" };
  }

  const config: StorageConfig = {
    type: "mega",
    credentials: {
      email: data.email.trim(),
      password: data.password, // will be encrypted at rest in config
      rootFolderName: data.rootFolderName?.trim() || "De Leo Content Hub",
    } satisfies MegaCredentials,
  };

  await db.appSetting.upsert({
    where: { key: "storage_config" },
    update: { value: encrypt(JSON.stringify(config)) },
    create: { key: "storage_config", value: encrypt(JSON.stringify(config)) },
  });

  invalidateStorageCache();
  revalidatePath("/admin/instellingen");
  return { success: true };
}

// ── Disconnect ────────────────────────────────────────────────────────────────

export async function disconnectProvider(): Promise<{ success: true }> {
  await requireAdmin();
  // Reset to local, keep upload dir
  await setLocalStorage();
  return { success: true };
}
