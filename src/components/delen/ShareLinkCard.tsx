"use client";

import { useState, useTransition } from "react";
import { Copy, RotateCcw, Clock, CheckCircle2, XCircle } from "lucide-react";
import { revokeShareLink } from "@/actions/shares";
import { formatDistanceToNow, isPast, format } from "date-fns";
import { nl } from "date-fns/locale";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

interface ShareLinkCardProps {
  link: {
    id: string;
    token: string;
    recipients: string;
    expiresAt: Date;
    revokedAt: Date | null;
    files: { file: { name: string; size: number } }[];
    downloads: { id: string }[];
  };
}

export function ShareLinkCard({ link }: ShareLinkCardProps) {
  const [copied, setCopied] = useState(false);
  const [revokeOpen, setRevokeOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const isExpired = isPast(new Date(link.expiresAt));
  const isRevoked = !!link.revokedAt;
  const isActive = !isExpired && !isRevoked;

  const url = `${typeof window !== "undefined" ? window.location.origin : ""}/download/${link.token}`;
  const totalSize = link.files.reduce((sum, f) => sum + f.file.size, 0);

  function copyLink() {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleRevoke() {
    startTransition(async () => {
      await revokeShareLink(link.id);
      setRevokeOpen(false);
    });
  }

  return (
    <>
      <div className={`bg-white rounded-xl border p-4 ${isActive ? "border-slate-100" : "border-slate-100 opacity-70"}`}>
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              {isActive ? (
                <span className="flex items-center gap-1 text-xs font-medium text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                  <CheckCircle2 size={10} /> Actief
                </span>
              ) : isRevoked ? (
                <span className="flex items-center gap-1 text-xs font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                  <XCircle size={10} /> Ingetrokken
                </span>
              ) : (
                <span className="flex items-center gap-1 text-xs font-medium text-red-500 bg-red-50 px-2 py-0.5 rounded-full">
                  <Clock size={10} /> Verlopen
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 truncate">
              Naar: {link.recipients.split(",").join(", ")}
            </p>
            <p className="text-xs text-slate-400 mt-0.5">
              {link.files.length} bestand(en) · {(totalSize / 1024 / 1024).toFixed(1)} MB
            </p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-xs text-slate-500">
              {isActive
                ? `Verloopt ${formatDistanceToNow(new Date(link.expiresAt), { locale: nl, addSuffix: true })}`
                : `Verlopen ${format(new Date(link.expiresAt), "d MMM yyyy", { locale: nl })}`}
            </p>
            <p className="text-xs text-slate-400">{link.downloads.length} downloads</p>
          </div>
        </div>

        {/* File list */}
        <div className="space-y-1 mb-3">
          {link.files.slice(0, 3).map((f, idx) => (
            <p key={idx} className="text-xs text-slate-600 truncate">
              · {f.file.name}
            </p>
          ))}
          {link.files.length > 3 && (
            <p className="text-xs text-slate-400">+ {link.files.length - 3} meer</p>
          )}
        </div>

        {/* Actions */}
        {isActive && (
          <div className="flex gap-2">
            <button
              onClick={copyLink}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600"
            >
              <Copy size={12} />
              {copied ? "Gekopieerd!" : "Link kopiëren"}
            </button>
            <button
              onClick={() => setRevokeOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-red-200 rounded-lg hover:bg-red-50 text-red-500"
            >
              <RotateCcw size={12} />
              Intrekken
            </button>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={revokeOpen}
        onClose={() => setRevokeOpen(false)}
        onConfirm={handleRevoke}
        title="Link intrekken"
        message="Weet je zeker dat je deze deellink wilt intrekken? De ontvanger kan dan niet meer downloaden."
        confirmLabel="Intrekken"
        loading={isPending}
      />
    </>
  );
}
