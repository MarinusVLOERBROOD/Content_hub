/**
 * OAuth 2.0 callback handler for cloud storage providers.
 * URL: GET /api/admin/storage/callback?provider=google-drive&code=...&state=...
 *
 * After the provider redirects here, we exchange the code for tokens,
 * merge them into the stored config, and redirect back to admin settings.
 */
import { timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { encrypt, decrypt } from "@/lib/encrypt";
import { invalidateStorageCache } from "@/lib/storage";
import type { StorageConfig } from "@/lib/storage/types";

const REDIRECT_BASE = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
const CALLBACK_URL = `${REDIRECT_BASE}/api/admin/storage/callback`;

export async function GET(req: Request) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.redirect(`${REDIRECT_BASE}/login`);
  }

  const { searchParams } = new URL(req.url);
  const provider = searchParams.get("provider");
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  if (error) {
    return NextResponse.redirect(
      `${REDIRECT_BASE}/admin/instellingen?storage_error=${encodeURIComponent(error)}`
    );
  }

  if (!provider || !code) {
    return NextResponse.redirect(
      `${REDIRECT_BASE}/admin/instellingen?storage_error=missing_params`
    );
  }

  // Verify CSRF state
  const stateSetting = await db.appSetting.findUnique({
    where: { key: "storage_oauth_state" },
  });
  const storedBuf = Buffer.from(stateSetting?.value ?? "");
  const receivedBuf = Buffer.from(state ?? "");
  const stateValid =
    stateSetting &&
    storedBuf.length === receivedBuf.length &&
    timingSafeEqual(storedBuf, receivedBuf);

  if (!stateValid) {
    return NextResponse.redirect(
      `${REDIRECT_BASE}/admin/instellingen?storage_error=invalid_state`
    );
  }
  // Delete state — one-time use
  await db.appSetting.delete({ where: { key: "storage_oauth_state" } });

  // Load current (partial) config
  const configSetting = await db.appSetting.findUnique({
    where: { key: "storage_config" },
  });
  if (!configSetting) {
    return NextResponse.redirect(
      `${REDIRECT_BASE}/admin/instellingen?storage_error=no_config`
    );
  }

  let config: StorageConfig;
  try {
    config = JSON.parse(decrypt(configSetting.value));
  } catch {
    return NextResponse.redirect(
      `${REDIRECT_BASE}/admin/instellingen?storage_error=decrypt_failed`
    );
  }

  try {
    if (provider === "google-drive") {
      const creds = config.credentials as {
        clientId: string;
        clientSecret: string;
        accessToken?: string;
        refreshToken?: string;
        expiresAt?: number;
      };
      const res = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: creds.clientId,
          client_secret: creds.clientSecret,
          code,
          redirect_uri: `${CALLBACK_URL}?provider=google-drive`,
          grant_type: "authorization_code",
        }),
      });
      if (!res.ok) throw new Error("Google token exchange mislukt");
      const json = (await res.json()) as {
        access_token: string;
        refresh_token?: string;
        expires_in: number;
      };
      creds.accessToken = json.access_token;
      if (json.refresh_token) creds.refreshToken = json.refresh_token;
      creds.expiresAt = Date.now() + json.expires_in * 1000;
      config.credentials = creds;
    } else if (provider === "onedrive") {
      const creds = config.credentials as {
        clientId: string;
        clientSecret: string;
        tenantId: string;
        accessToken?: string;
        refreshToken?: string;
        expiresAt?: number;
      };
      const tenant = creds.tenantId || "common";
      const res = await fetch(
        `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`,
        {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            client_id: creds.clientId,
            client_secret: creds.clientSecret,
            code,
            redirect_uri: `${CALLBACK_URL}?provider=onedrive`,
            grant_type: "authorization_code",
            scope:
              "https://graph.microsoft.com/Files.ReadWrite offline_access",
          }),
        }
      );
      if (!res.ok) throw new Error("OneDrive token exchange mislukt");
      const json = (await res.json()) as {
        access_token: string;
        refresh_token?: string;
        expires_in: number;
      };
      creds.accessToken = json.access_token;
      if (json.refresh_token) creds.refreshToken = json.refresh_token;
      creds.expiresAt = Date.now() + json.expires_in * 1000;
      config.credentials = creds;
    } else if (provider === "dropbox") {
      const creds = config.credentials as {
        appKey: string;
        appSecret: string;
        accessToken?: string;
        refreshToken?: string;
        expiresAt?: number;
      };
      const res = await fetch("https://api.dropboxapi.com/oauth2/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: `Basic ${Buffer.from(`${creds.appKey}:${creds.appSecret}`).toString("base64")}`,
        },
        body: new URLSearchParams({
          code,
          redirect_uri: `${CALLBACK_URL}?provider=dropbox`,
          grant_type: "authorization_code",
        }),
      });
      if (!res.ok) throw new Error("Dropbox token exchange mislukt");
      const json = (await res.json()) as {
        access_token: string;
        refresh_token?: string;
        expires_in?: number;
      };
      creds.accessToken = json.access_token;
      if (json.refresh_token) creds.refreshToken = json.refresh_token;
      if (json.expires_in) creds.expiresAt = Date.now() + json.expires_in * 1000;
      config.credentials = creds;
    } else {
      return NextResponse.redirect(
        `${REDIRECT_BASE}/admin/instellingen?storage_error=unknown_provider`
      );
    }

    // Persist updated config
    await db.appSetting.update({
      where: { key: "storage_config" },
      data: { value: encrypt(JSON.stringify(config)) },
    });
    invalidateStorageCache();

    return NextResponse.redirect(
      `${REDIRECT_BASE}/admin/instellingen?storage_connected=1`
    );
  } catch (err) {
    console.error("OAuth callback error:", err);
    return NextResponse.redirect(
      `${REDIRECT_BASE}/admin/instellingen?storage_error=token_exchange_failed`
    );
  }
}
