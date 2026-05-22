"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, XCircle, Clock, RotateCcw, Trash2 } from "lucide-react";
import { adminReactivateShareLink, adminDeleteShareLink } from "@/actions/admin/shares";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { format, isPast } from "date-fns";
import { nl } from "date-fns/locale";

type ShareLink = {
  id: string;
  token: string;
  recipients: string;
  expiresAt: Date;
  revokedAt: Date | null;
  createdAt: Date;
  createdBy: { name: string; email: string };
  files: { file: { name: string; size: number } }[];
  downloads: { id: string }[];
};

type Filter = "all" | "active" | "expired" | "revoked";

export function ShareLinkAdmin({ links }: { links: ShareLink[] }) {
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>("all");
  const [confirmAction, setConfirmAction] = useState<{
    type: "reactivate" | "delete";
    id: string;
  } | null>(null);
  const [isPending, startTransition] = useTransition();

  function getStatus(link: ShareLink) {
    if (link.revokedAt) return "revoked";
    if (isPast(new Date(link.expiresAt))) return "expired";
    return "active";
  }

  const filtered = links.filter((l) => {
    if (filter === "all") return true;
    return getStatus(l) === filter;
  });

  function handleConfirm() {
    if (!confirmAction) return;
    startTransition(async () => {
      if (confirmAction.type === "reactivate") {
        await adminReactivateShareLink(confirmAction.id);
      } else {
        await adminDeleteShareLink(confirmAction.id);
      }
      setConfirmAction(null);
      router.refresh();
    });
  }

  const filterButtons: { key: Filter; label: string }[] = [
    { key: "all", label: "Alles" },
    { key: "active", label: "Actief" },
    { key: "expired", label: "Verlopen" },
    { key: "revoked", label: "Ingetrokken" },
  ];

  return (
    <div>
      {/* Filter buttons */}
      <div className="flex gap-2 mb-4">
        {filterButtons.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
              filter === key
                ? "bg-purple-700 text-white border-purple-700"
                : "border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-slate-400 py-8 text-center">Geen deellinks gevonden.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="text-left py-2 px-3 text-xs font-semibold text-slate-500">Status</th>
                <th className="text-left py-2 px-3 text-xs font-semibold text-slate-500">Aangemaakt door</th>
                <th className="text-left py-2 px-3 text-xs font-semibold text-slate-500">Ontvangers</th>
                <th className="text-left py-2 px-3 text-xs font-semibold text-slate-500">Bestanden</th>
                <th className="text-left py-2 px-3 text-xs font-semibold text-slate-500">Vervalt</th>
                <th className="text-left py-2 px-3 text-xs font-semibold text-slate-500">Downloads</th>
                <th className="text-right py-2 px-3 text-xs font-semibold text-slate-500">Acties</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map((link) => {
                const status = getStatus(link);
                return (
                  <tr key={link.id} className="hover:bg-slate-50">
                    <td className="py-2.5 px-3">
                      {status === "active" && (
                        <span className="flex items-center gap-1 text-xs font-medium text-green-600 bg-green-50 px-2 py-0.5 rounded-full w-fit">
                          <CheckCircle2 size={10} /> Actief
                        </span>
                      )}
                      {status === "revoked" && (
                        <span className="flex items-center gap-1 text-xs font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full w-fit">
                          <XCircle size={10} /> Ingetrokken
                        </span>
                      )}
                      {status === "expired" && (
                        <span className="flex items-center gap-1 text-xs font-medium text-red-500 bg-red-50 px-2 py-0.5 rounded-full w-fit">
                          <Clock size={10} /> Verlopen
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3">
                      <p className="text-slate-700 font-medium">{link.createdBy.name}</p>
                      <p className="text-xs text-slate-400">{link.createdBy.email}</p>
                    </td>
                    <td className="py-2.5 px-3 text-slate-600 max-w-[180px] truncate">
                      {link.recipients.split(",").join(", ")}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600">{link.files.length}</td>
                    <td className="py-2.5 px-3 text-slate-500 text-xs">
                      {format(new Date(link.expiresAt), "d MMM yyyy", { locale: nl })}
                    </td>
                    <td className="py-2.5 px-3 text-slate-500">{link.downloads.length}</td>
                    <td className="py-2.5 px-3">
                      <div className="flex gap-1.5 justify-end">
                        {status === "revoked" && (
                          <button
                            onClick={() => setConfirmAction({ type: "reactivate", id: link.id })}
                            className="flex items-center gap-1 px-2.5 py-1 text-xs border border-green-200 rounded-lg hover:bg-green-50 text-green-600"
                          >
                            <RotateCcw size={11} />
                            Heractiveren
                          </button>
                        )}
                        <button
                          onClick={() => setConfirmAction({ type: "delete", id: link.id })}
                          className="flex items-center gap-1 px-2.5 py-1 text-xs border border-red-200 rounded-lg hover:bg-red-50 text-red-500"
                        >
                          <Trash2 size={11} />
                          Verwijderen
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmDialog
        open={confirmAction?.type === "reactivate"}
        onClose={() => setConfirmAction(null)}
        onConfirm={handleConfirm}
        title="Link heractiveren"
        message="Weet je zeker dat je deze deellink wilt heractiveren? Als de link verlopen was, wordt de vervaldatum met 7 dagen verlengd."
        confirmLabel="Heractiveren"
        loading={isPending}
      />

      <ConfirmDialog
        open={confirmAction?.type === "delete"}
        onClose={() => setConfirmAction(null)}
        onConfirm={handleConfirm}
        title="Link verwijderen"
        message="Weet je zeker dat je deze deellink permanent wilt verwijderen? Dit kan niet ongedaan worden gemaakt."
        confirmLabel="Verwijderen"
        loading={isPending}
      />
    </div>
  );
}
