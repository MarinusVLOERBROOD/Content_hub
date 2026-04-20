"use client";

import { useState, useTransition } from "react";
import { Plus, X, FileText, Image, Video, File } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { FileBrowserPicker } from "./FileBrowserPicker";
import { createShareLink } from "@/actions/shares";

interface SelectedFile {
  id: string;
  name: string;
  mimeType: string;
  size: number;
}

function fileIcon(mimeType: string) {
  if (mimeType.startsWith("image/")) return <Image size={14} className="text-blue-400" />;
  if (mimeType.startsWith("video/")) return <Video size={14} className="text-purple-400" />;
  if (mimeType === "application/pdf") return <FileText size={14} className="text-red-400" />;
  return <File size={14} className="text-slate-400" />;
}

function formatSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

const expiryOptions = [
  { value: "3", label: "3 dagen" },
  { value: "7", label: "7 dagen" },
  { value: "14", label: "14 dagen" },
  { value: "30", label: "30 dagen" },
];

interface NewShareFormProps {
  onCreated: (token: string) => void;
}

export function NewShareForm({ onCreated }: NewShareFormProps) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<SelectedFile[]>([]);
  const [recipient, setRecipient] = useState("");
  const [recipients, setRecipients] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [expiresInDays, setExpiresInDays] = useState("7");
  const [error, setError] = useState<string | null>(null);
  const [generatedToken, setGeneratedToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isPending, startTransition] = useTransition();

  function addRecipient() {
    if (recipient && !recipients.includes(recipient)) {
      setRecipients([...recipients, recipient]);
      setRecipient("");
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (selectedFiles.length === 0) {
      setError("Selecteer minstens één bestand");
      return;
    }
    if (recipients.length === 0) {
      setError("Voeg minstens één ontvanger toe");
      return;
    }
    startTransition(async () => {
      const result = await createShareLink({
        fileIds: selectedFiles.map((f) => f.id),
        recipients,
        message: message || undefined,
        expiresInDays: parseInt(expiresInDays),
      });

      if (result.error) {
        setError(result.error);
      } else if (result.token) {
        setGeneratedToken(result.token);
      }
    });
  }

  function copyLink() {
    const url = `${window.location.origin}/download/${generatedToken}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function reset() {
    setSelectedFiles([]);
    setRecipients([]);
    setMessage("");
    setGeneratedToken(null);
    if (generatedToken) onCreated(generatedToken);
  }

  return (
    <>
      <div className="bg-white rounded-xl border border-slate-100 p-6">
        <h3 className="text-base font-semibold text-slate-900 mb-4">Nieuwe verzending</h3>

        {generatedToken ? (
          <div className="space-y-4">
            <div className="p-4 bg-green-50 border border-green-200 rounded-xl">
              <p className="text-sm font-medium text-green-700 mb-2">Link gegenereerd!</p>
              <div className="flex gap-2">
                <input
                  readOnly
                  value={`${typeof window !== "undefined" ? window.location.origin : ""}/download/${generatedToken}`}
                  className="flex-1 px-3 py-2 text-sm border border-green-200 rounded-lg bg-white"
                />
                <Button onClick={copyLink} variant="secondary" size="sm">
                  {copied ? "Gekopieerd!" : "Kopiëren"}
                </Button>
              </div>
            </div>
            <Button onClick={reset} variant="secondary" className="w-full">
              Nieuwe verzending
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* File selection */}
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-2">
                Bestanden
              </label>
              {selectedFiles.length > 0 && (
                <div className="space-y-1 mb-2">
                  {selectedFiles.map((f) => (
                    <div key={f.id} className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg">
                      {fileIcon(f.mimeType)}
                      <span className="flex-1 text-sm text-slate-700 truncate">{f.name}</span>
                      <span className="text-xs text-slate-400">{formatSize(f.size)}</span>
                      <button
                        type="button"
                        onClick={() => setSelectedFiles(selectedFiles.filter((sf) => sf.id !== f.id))}
                        className="text-slate-400 hover:text-slate-600"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setPickerOpen(true)}
              >
                <Plus size={14} />
                Bestanden selecteren
              </Button>
            </div>

            {/* Recipients */}
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-2">
                Ontvanger(s)
              </label>
              {recipients.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-2">
                  {recipients.map((r) => (
                    <span key={r} className="flex items-center gap-1 px-2 py-0.5 bg-teal-50 text-teal-700 rounded-full text-xs">
                      {r}
                      <button type="button" onClick={() => setRecipients(recipients.filter((x) => x !== r))}>
                        <X size={10} />
                      </button>
                    </span>
                  ))}
                </div>
              )}
              <div className="flex gap-2">
                <Input
                  type="email"
                  placeholder="e-mail@voorbeeld.nl"
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") { e.preventDefault(); addRecipient(); }
                  }}
                  className="flex-1"
                />
                <Button type="button" variant="secondary" onClick={addRecipient} size="md">
                  <Plus size={14} />
                </Button>
              </div>
            </div>

            {/* Message */}
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-1">
                Bericht (optioneel)
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={3}
                placeholder="Hier zijn de gevraagde bestanden..."
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
              />
            </div>

            {/* Expiry */}
            <Select
              label="Vervaldatum"
              options={expiryOptions}
              value={expiresInDays}
              onChange={(e) => setExpiresInDays(e.target.value)}
            />

            {error && (
              <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={isPending}
            >
              {isPending ? "Verzenden..." : "Versturen & link genereren"}
            </Button>
          </form>
        )}
      </div>

      <FileBrowserPicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={(files) => setSelectedFiles(files)}
        selectedIds={selectedFiles.map((f) => f.id)}
      />
    </>
  );
}
