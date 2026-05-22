"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { RotateCcw, Trash2 } from "lucide-react";
import { restoreFile, permanentDeleteFile } from "@/actions/admin/trash";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { format } from "date-fns";
import { nl } from "date-fns/locale";

type TrashedFile = {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  relativePath: string;
  deletedAt: Date | null;
  client: { name: string; slug: string };
  uploadedBy: { name: string };
};

export function TrashManager({ files }: { files: TrashedFile[] }) {
  const router = useRouter();
  const [confirmAction, setConfirmAction] = useState<{
    type: "restore" | "delete";
    id: string;
    name: string;
  } | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleConfirm() {
    if (!confirmAction) return;
    startTransition(async () => {
      if (confirmAction.type === "restore") {
        await restoreFile(confirmAction.id);
      } else {
        await permanentDeleteFile(confirmAction.id);
      }
      setConfirmAction(null);
      router.refresh();
    });
  }

  function formatSize(bytes: number) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  }

  function getFolderPath(relativePath: string) {
    const parts = relativePath.split("/");
    return parts.length > 1 ? parts.slice(0, -1).join("/") : "—";
  }

  if (files.length === 0) {
    return (
      <div className="text-center py-16">
        <Trash2 className="w-10 h-10 text-slate-200 mx-auto mb-3" />
        <p className="text-sm text-slate-400">De prullebak is leeg.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100">
              <th className="text-left py-2 px-3 text-xs font-semibold text-slate-500">Bestand</th>
              <th className="text-left py-2 px-3 text-xs font-semibold text-slate-500">Client</th>
              <th className="text-left py-2 px-3 text-xs font-semibold text-slate-500">Map</th>
              <th className="text-left py-2 px-3 text-xs font-semibold text-slate-500">Grootte</th>
              <th className="text-left py-2 px-3 text-xs font-semibold text-slate-500">Verwijderd op</th>
              <th className="text-left py-2 px-3 text-xs font-semibold text-slate-500">Door</th>
              <th className="text-right py-2 px-3 text-xs font-semibold text-slate-500">Acties</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {files.map((file) => (
              <tr key={file.id} className="hover:bg-slate-50">
                <td className="py-2.5 px-3">
                  <p className="text-slate-700 font-medium truncate max-w-[200px]">{file.name}</p>
                  <p className="text-xs text-slate-400">{file.mimeType}</p>
                </td>
                <td className="py-2.5 px-3 text-slate-600">{file.client.name}</td>
                <td className="py-2.5 px-3 text-slate-500 text-xs font-mono">
                  {getFolderPath(file.relativePath)}
                </td>
                <td className="py-2.5 px-3 text-slate-500">{formatSize(file.size)}</td>
                <td className="py-2.5 px-3 text-slate-500 text-xs">
                  {file.deletedAt
                    ? format(new Date(file.deletedAt), "d MMM yyyy HH:mm", { locale: nl })
                    : "—"}
                </td>
                <td className="py-2.5 px-3 text-slate-500 text-xs">{file.uploadedBy.name}</td>
                <td className="py-2.5 px-3">
                  <div className="flex gap-1.5 justify-end">
                    <button
                      onClick={() =>
                        setConfirmAction({ type: "restore", id: file.id, name: file.name })
                      }
                      className="flex items-center gap-1 px-2.5 py-1 text-xs border border-green-200 rounded-lg hover:bg-green-50 text-green-600"
                    >
                      <RotateCcw size={11} />
                      Herstellen
                    </button>
                    <button
                      onClick={() =>
                        setConfirmAction({ type: "delete", id: file.id, name: file.name })
                      }
                      className="flex items-center gap-1 px-2.5 py-1 text-xs border border-red-200 rounded-lg hover:bg-red-50 text-red-500"
                    >
                      <Trash2 size={11} />
                      Permanent
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ConfirmDialog
        open={confirmAction?.type === "restore"}
        onClose={() => setConfirmAction(null)}
        onConfirm={handleConfirm}
        title="Bestand herstellen"
        message={`Weet je zeker dat je "${confirmAction?.name}" wilt herstellen? Het bestand verschijnt weer in de bestandenlijst.`}
        confirmLabel="Herstellen"
        loading={isPending}
      />

      <ConfirmDialog
        open={confirmAction?.type === "delete"}
        onClose={() => setConfirmAction(null)}
        onConfirm={handleConfirm}
        title="Permanent verwijderen"
        message={`Weet je zeker dat je "${confirmAction?.name}" permanent wilt verwijderen? Het bestand wordt van de schijf verwijderd en kan niet worden hersteld.`}
        confirmLabel="Permanent verwijderen"
        loading={isPending}
      />
    </div>
  );
}
