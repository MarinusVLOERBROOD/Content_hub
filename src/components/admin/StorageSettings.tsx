"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  HardDrive,
  Cloud,
  CheckCircle,
  AlertCircle,
  ExternalLink,
  Unlink,
  ChevronDown,
  ChevronRight,
  Lock,
} from "lucide-react";
import {
  setLocalStorage,
  saveGoogleDriveCredentials,
  saveOneDriveCredentials,
  saveDropboxCredentials,
  saveMegaCredentials,
  disconnectProvider,
} from "@/actions/admin/storage";
import type { ProviderType } from "@/lib/storage/types";

interface StorageSettingsProps {
  current: {
    type: ProviderType;
    connected: boolean;
    display: Record<string, string>;
  } | null;
  connectedNotice?: boolean;
  errorNotice?: string;
}

const PROVIDERS = [
  { id: "local" as const, label: "Lokale opslag", icon: "💾", color: "slate" },
  { id: "google-drive" as const, label: "Google Drive", icon: "🟢", color: "green" },
  { id: "onedrive" as const, label: "Microsoft OneDrive", icon: "🔵", color: "blue" },
  { id: "dropbox" as const, label: "Dropbox", icon: "📦", color: "indigo" },
  { id: "mega" as const, label: "MEGA", icon: "🔴", color: "red" },
];

function FieldRow({
  label,
  id,
  value,
  onChange,
  type = "text",
  placeholder,
  hint,
  required,
}: {
  label: string;
  id: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  hint?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-xs font-medium text-slate-600 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        autoComplete="off"
        className="w-full text-sm font-mono border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-teal-500"
      />
      {hint && <p className="text-xs text-slate-400 mt-1">{hint}</p>}
    </div>
  );
}

export function StorageSettings({
  current,
  connectedNotice,
  errorNotice,
}: StorageSettingsProps) {
  const router = useRouter();
  const [selected, setSelected] = useState<ProviderType>(
    current?.type ?? "local"
  );
  const [expanded, setExpanded] = useState<ProviderType | null>(
    current?.type ?? "local"
  );
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(errorNotice ?? null);
  const [success, setSuccess] = useState(connectedNotice ?? false);

  // Per-provider form state
  const [gd, setGd] = useState({ clientId: "", clientSecret: "", rootFolderId: "" });
  const [od, setOd] = useState({ clientId: "", clientSecret: "", tenantId: "", rootFolderPath: "" });
  const [db, setDb] = useState({ appKey: "", appSecret: "", rootPath: "" });
  const [mega, setMega] = useState({ email: "", password: "", rootFolderName: "" });

  function toggle(id: ProviderType) {
    setExpanded((prev) => (prev === id ? null : id));
    setSelected(id);
    setError(null);
  }

  function handleSelectLocal() {
    setError(null);
    setSuccess(false);
    startTransition(async () => {
      await setLocalStorage();
      setSuccess(true);
      router.refresh();
    });
  }

  function handleConnectOAuth(authUrl: string) {
    window.location.href = authUrl;
  }

  function handleGoogleDrive() {
    setError(null);
    startTransition(async () => {
      try {
        const result = await saveGoogleDriveCredentials(gd);
        handleConnectOAuth(result.authUrl);
      } catch (e) {
        setError((e as Error).message);
      }
    });
  }

  function handleOneDrive() {
    setError(null);
    startTransition(async () => {
      try {
        const result = await saveOneDriveCredentials(od);
        handleConnectOAuth(result.authUrl);
      } catch (e) {
        setError((e as Error).message);
      }
    });
  }

  function handleDropbox() {
    setError(null);
    startTransition(async () => {
      try {
        const result = await saveDropboxCredentials(db);
        handleConnectOAuth(result.authUrl);
      } catch (e) {
        setError((e as Error).message);
      }
    });
  }

  function handleMega() {
    setError(null);
    startTransition(async () => {
      const result = await saveMegaCredentials(mega);
      if ("error" in result) setError(result.error);
      else { setSuccess(true); router.refresh(); }
    });
  }

  function handleDisconnect() {
    setError(null);
    setSuccess(false);
    startTransition(async () => {
      await disconnectProvider();
      setSuccess(false);
      router.refresh();
    });
  }

  const activeType = current?.type ?? "local";

  return (
    <div className="space-y-4">
      {/* Status bar */}
      {success && (
        <div className="flex items-center gap-2 px-4 py-3 bg-teal-50 border border-teal-200 rounded-xl text-sm text-teal-700">
          <CheckCircle size={16} />
          Cloudopslag succesvol gekoppeld
        </div>
      )}
      {error && (
        <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      {/* Current active provider */}
      {current && (
        <div className="flex items-center justify-between px-4 py-3 bg-slate-50 rounded-xl border border-slate-200">
          <div className="flex items-center gap-2 text-sm text-slate-700">
            <span>Actief:</span>
            <span className="font-semibold">
              {PROVIDERS.find((p) => p.id === activeType)?.label ?? activeType}
            </span>
            {current.connected && activeType !== "local" && (
              <span className="flex items-center gap-1 text-xs text-teal-600 font-medium">
                <CheckCircle size={12} />
                Verbonden
              </span>
            )}
          </div>
          {activeType !== "local" && (
            <button
              onClick={handleDisconnect}
              disabled={isPending}
              className="flex items-center gap-1.5 text-xs text-red-500 hover:text-red-700"
            >
              <Unlink size={12} />
              Ontkoppelen
            </button>
          )}
        </div>
      )}

      {/* Provider list */}
      <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
        {PROVIDERS.map((p) => {
          const isActive = activeType === p.id;
          const isOpen = expanded === p.id;
          return (
            <div key={p.id}>
              <button
                onClick={() => toggle(p.id)}
                className={`w-full flex items-center justify-between px-4 py-3 text-left transition-colors ${
                  isActive ? "bg-teal-50" : "bg-white hover:bg-slate-50"
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg">{p.icon}</span>
                  <div>
                    <p className="text-sm font-medium text-slate-800">{p.label}</p>
                    {isActive && (
                      <p className="text-xs text-teal-600">Momenteel actief</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {isActive && (
                    <span className="w-2 h-2 rounded-full bg-teal-500" />
                  )}
                  {isOpen ? (
                    <ChevronDown size={16} className="text-slate-400" />
                  ) : (
                    <ChevronRight size={16} className="text-slate-400" />
                  )}
                </div>
              </button>

              {isOpen && (
                <div className="px-4 py-4 bg-slate-50 border-t border-slate-100 space-y-4">
                  {p.id === "local" && (
                    <>
                      <div className="flex items-start gap-3 p-3 bg-white rounded-lg border border-slate-200">
                        <HardDrive size={16} className="text-slate-400 mt-0.5 shrink-0" />
                        <div className="text-sm text-slate-600">
                          <p>Bestanden worden opgeslagen in:</p>
                          <code className="text-xs bg-slate-100 px-2 py-0.5 rounded mt-1 inline-block">
                            {process.env.UPLOAD_DIR ?? "./uploads"}
                          </code>
                          <p className="text-xs text-slate-400 mt-2">
                            Pas <code>UPLOAD_DIR</code> in je <code>.env</code> aan om de map te wijzigen.
                          </p>
                        </div>
                      </div>
                      {activeType !== "local" && (
                        <button
                          onClick={handleSelectLocal}
                          disabled={isPending}
                          className="px-4 py-2 bg-slate-700 text-white text-sm rounded-lg hover:bg-slate-800 disabled:opacity-60"
                        >
                          {isPending ? "Bezig..." : "Overschakelen naar lokale opslag"}
                        </button>
                      )}
                    </>
                  )}

                  {p.id === "google-drive" && (
                    <>
                      <SecurityNote />
                      <div className="space-y-3">
                        <FieldRow label="Client ID" id="gd-cid" value={gd.clientId} onChange={(v) => setGd({ ...gd, clientId: v })} placeholder="123...apps.googleusercontent.com" required />
                        <FieldRow label="Client Secret" id="gd-cs" value={gd.clientSecret} onChange={(v) => setGd({ ...gd, clientSecret: v })} type="password" placeholder="GOCSPX-..." required />
                        <FieldRow label="Root map ID (optioneel)" id="gd-rf" value={gd.rootFolderId} onChange={(v) => setGd({ ...gd, rootFolderId: v })} placeholder="1BxiMVs0XRA5..." hint="Laat leeg om Mijn Drive als root te gebruiken" />
                      </div>
                      <SetupGuide href="https://console.cloud.google.com/apis/credentials" label="Google Cloud Console">
                        Maak een OAuth 2.0 client aan (type: Webapplicatie) met redirect URI:
                        <br />
                        <code className="text-xs">{`${typeof window !== "undefined" ? window.location.origin : ""}/api/admin/storage/callback?provider=google-drive`}</code>
                      </SetupGuide>
                      <button onClick={handleGoogleDrive} disabled={isPending || !gd.clientId || !gd.clientSecret} className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-teal-600 text-white text-sm rounded-lg hover:bg-teal-700 disabled:opacity-40">
                        <ExternalLink size={14} />
                        {isPending ? "Bezig..." : "Opslaan & verbinden met Google"}
                      </button>
                    </>
                  )}

                  {p.id === "onedrive" && (
                    <>
                      <SecurityNote />
                      <div className="space-y-3">
                        <FieldRow label="Client ID (Application ID)" id="od-cid" value={od.clientId} onChange={(v) => setOd({ ...od, clientId: v })} placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" required />
                        <FieldRow label="Client Secret" id="od-cs" value={od.clientSecret} onChange={(v) => setOd({ ...od, clientSecret: v })} type="password" required />
                        <FieldRow label="Tenant ID" id="od-tid" value={od.tenantId} onChange={(v) => setOd({ ...od, tenantId: v })} placeholder="common (persoonlijk) of je Azure tenant ID" hint="Gebruik 'common' voor persoonlijke Microsoft accounts" />
                        <FieldRow label="Root map pad (optioneel)" id="od-rfp" value={od.rootFolderPath} onChange={(v) => setOd({ ...od, rootFolderPath: v })} placeholder="root:/De Leo Content Hub:" hint="OneDrive pad naar de root map" />
                      </div>
                      <SetupGuide href="https://portal.azure.com/#view/Microsoft_AAD_RegisteredApps" label="Azure App Registrations">
                        Registreer een app, voeg redirect URI toe (type: Web):
                        <br />
                        <code className="text-xs">{`${typeof window !== "undefined" ? window.location.origin : ""}/api/admin/storage/callback?provider=onedrive`}</code>
                        <br />
                        Voeg permissie toe: Microsoft Graph → Files.ReadWrite
                      </SetupGuide>
                      <button onClick={handleOneDrive} disabled={isPending || !od.clientId || !od.clientSecret} className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-teal-600 text-white text-sm rounded-lg hover:bg-teal-700 disabled:opacity-40">
                        <ExternalLink size={14} />
                        {isPending ? "Bezig..." : "Opslaan & verbinden met Microsoft"}
                      </button>
                    </>
                  )}

                  {p.id === "dropbox" && (
                    <>
                      <SecurityNote />
                      <div className="space-y-3">
                        <FieldRow label="App Key" id="dbx-ak" value={db.appKey} onChange={(v) => setDb({ ...db, appKey: v })} required />
                        <FieldRow label="App Secret" id="dbx-as" value={db.appSecret} onChange={(v) => setDb({ ...db, appSecret: v })} type="password" required />
                        <FieldRow label="Root map pad (optioneel)" id="dbx-rp" value={db.rootPath} onChange={(v) => setDb({ ...db, rootPath: v })} placeholder="/De Leo Content Hub" hint="Pad in Dropbox waar bestanden worden opgeslagen" />
                      </div>
                      <SetupGuide href="https://www.dropbox.com/developers/apps" label="Dropbox App Console">
                        Maak een app aan (scoped access, Full Dropbox). Voeg redirect URI toe:
                        <br />
                        <code className="text-xs">{`${typeof window !== "undefined" ? window.location.origin : ""}/api/admin/storage/callback?provider=dropbox`}</code>
                        <br />
                        Schakel scope <code>files.content.write</code> en <code>files.content.read</code> in.
                      </SetupGuide>
                      <button onClick={handleDropbox} disabled={isPending || !db.appKey || !db.appSecret} className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-teal-600 text-white text-sm rounded-lg hover:bg-teal-700 disabled:opacity-40">
                        <ExternalLink size={14} />
                        {isPending ? "Bezig..." : "Opslaan & verbinden met Dropbox"}
                      </button>
                    </>
                  )}

                  {p.id === "mega" && (
                    <>
                      <SecurityNote mega />
                      <div className="space-y-3">
                        <FieldRow label="MEGA e-mailadres" id="mega-email" value={mega.email} onChange={(v) => setMega({ ...mega, email: v })} type="email" required />
                        <FieldRow label="Wachtwoord" id="mega-pw" value={mega.password} onChange={(v) => setMega({ ...mega, password: v })} type="password" required />
                        <FieldRow label="Root mapnaam (optioneel)" id="mega-rfn" value={mega.rootFolderName} onChange={(v) => setMega({ ...mega, rootFolderName: v })} placeholder="De Leo Content Hub" />
                      </div>
                      <button onClick={handleMega} disabled={isPending || !mega.email || !mega.password} className="w-full px-4 py-2 bg-teal-600 text-white text-sm rounded-lg hover:bg-teal-700 disabled:opacity-40">
                        {isPending ? "Bezig..." : "Verbinden met MEGA"}
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <p className="text-xs text-slate-400 flex items-center gap-1.5">
        <Lock size={11} />
        Inloggegevens worden versleuteld opgeslagen (AES-256-GCM).
      </p>
    </div>
  );
}

function SecurityNote({ mega }: { mega?: boolean }) {
  return (
    <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700">
      <Lock size={13} className="shrink-0 mt-0.5" />
      <span>
        {mega
          ? "Je MEGA-wachtwoord wordt versleuteld opgeslagen. Overweeg een apart MEGA-account aan te maken voor de hub."
          : "Client Secret wordt versleuteld opgeslagen. Deel deze pagina nooit met onbevoegden."}
      </span>
    </div>
  );
}

function SetupGuide({
  href,
  label,
  children,
}: {
  href: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="p-3 bg-white border border-slate-200 rounded-lg text-xs text-slate-600 space-y-1">
      <p className="font-medium text-slate-700">Instellen:</p>
      <p className="leading-relaxed">{children}</p>
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 text-teal-600 hover:underline mt-1"
      >
        Open {label}
        <ExternalLink size={11} />
      </a>
    </div>
  );
}
