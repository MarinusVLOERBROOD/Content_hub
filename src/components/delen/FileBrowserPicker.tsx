"use client";

import { useState, useEffect } from "react";
import { Search, FileText, Image, Video, File, X, Check } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";

interface FileItem {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  relativePath: string;
  client: { name: string; slug: string };
}

interface FileBrowserPickerProps {
  open: boolean;
  onClose: () => void;
  onSelect: (files: FileItem[]) => void;
  selectedIds: string[];
}

function fileIcon(mimeType: string) {
  if (mimeType.startsWith("image/")) return <Image size={14} className="text-blue-400 shrink-0" />;
  if (mimeType.startsWith("video/")) return <Video size={14} className="text-purple-400 shrink-0" />;
  if (mimeType === "application/pdf") return <FileText size={14} className="text-red-400 shrink-0" />;
  return <File size={14} className="text-slate-400 shrink-0" />;
}

function formatSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function FileBrowserPicker({ open, onClose, onSelect, selectedIds }: FileBrowserPickerProps) {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [clients, setClients] = useState<{ id: string; name: string; slug: string }[]>([]);
  const [activeClient, setActiveClient] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [picked, setPicked] = useState<Set<string>>(new Set(selectedIds));
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    fetch("/api/clients")
      .then((r) => r.json())
      .then((c) => {
        setClients(c);
        if (c.length > 0 && !activeClient) setActiveClient(c[0].slug);
      });
  }, [open]);

  useEffect(() => {
    if (!activeClient) return;
    setLoading(true);
    fetch(`/api/clients/${activeClient}/files/all`)
      .then((r) => r.json())
      .then((f) => {
        const withClient = f.map((file: any) => ({
          ...file,
          client: clients.find((c) => c.slug === activeClient) ?? { name: activeClient, slug: activeClient },
        }));
        setFiles(withClient);
      })
      .finally(() => setLoading(false));
  }, [activeClient, clients]);

  function toggleFile(id: string) {
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleConfirm() {
    const selected = files.filter((f) => picked.has(f.id));
    onSelect(selected);
    onClose();
  }

  const filtered = files.filter((f) =>
    f.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Modal open={open} onClose={onClose} title="Bestanden selecteren" width="max-w-2xl">
      <div className="flex h-96 gap-4">
        {/* Client list */}
        <div className="w-36 shrink-0 border-r border-slate-100 pr-3 overflow-y-auto">
          <p className="text-xs font-semibold text-slate-500 uppercase mb-2">Klanten</p>
          {clients.map((c) => (
            <button
              key={c.id}
              onClick={() => setActiveClient(c.slug)}
              className={`w-full text-left px-2 py-1.5 rounded text-sm mb-0.5 ${
                activeClient === c.slug
                  ? "bg-teal-50 text-teal-700 font-medium"
                  : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>

        {/* File list */}
        <div className="flex-1 flex flex-col">
          <div className="relative mb-3">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Zoeken..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <div className="flex-1 overflow-y-auto space-y-1">
            {loading && <p className="text-sm text-slate-400 py-4 text-center">Laden...</p>}
            {!loading && filtered.length === 0 && (
              <p className="text-sm text-slate-400 py-4 text-center">Geen bestanden</p>
            )}
            {filtered.map((f) => (
              <button
                key={f.id}
                onClick={() => toggleFile(f.id)}
                className={`flex items-center gap-3 w-full px-3 py-2 rounded-lg text-left transition-colors ${
                  picked.has(f.id)
                    ? "bg-teal-50 border border-teal-200"
                    : "hover:bg-slate-50 border border-transparent"
                }`}
              >
                <div className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 ${
                  picked.has(f.id) ? "bg-teal-600 border-teal-600" : "border-slate-300"
                }`}>
                  {picked.has(f.id) && <Check size={10} className="text-white" />}
                </div>
                {fileIcon(f.mimeType)}
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-800 truncate">{f.name}</p>
                  <p className="text-xs text-slate-400">{formatSize(f.size)}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-100">
        <span className="text-sm text-slate-500">
          {picked.size} bestand(en) geselecteerd
        </span>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={onClose}>Annuleren</Button>
          <Button onClick={handleConfirm} disabled={picked.size === 0}>
            Bevestigen
          </Button>
        </div>
      </div>
    </Modal>
  );
}
