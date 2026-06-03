"use client";

import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, X, CheckCircle2, AlertCircle, Clock, FolderOpen } from "lucide-react";
import { FolderTree } from "@/components/bestanden/FolderTree";
import type { FolderNode } from "@/lib/client-folders";

interface FileUploadZoneProps {
  clientSlug: string;
  folderPath: string;
  folders: FolderNode[];
  onUploadComplete: () => void;
}

interface UploadFile {
  file: File;
  status: "pending" | "uploading" | "done" | "error";
  error?: string;
}

export function FileUploadZone({ clientSlug, folderPath, folders, onUploadComplete }: FileUploadZoneProps) {
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [localFolder, setLocalFolder] = useState<string | null>(null);
  const [showFolderPicker, setShowFolderPicker] = useState(false);

  const effectiveFolder = localFolder ?? folderPath;
  const hasPending = files.some((f) => f.status === "pending");
  const needsFolderPick = hasPending && effectiveFolder === "";

  const MAX_SIZE = 25 * 1024 * 1024;

  const onDrop = useCallback((accepted: File[]) => {
    setFiles((prev) => [
      ...prev,
      ...accepted.map((f) =>
        f.size > MAX_SIZE
          ? { file: f, status: "error" as const, error: "Bestand is te groot (max 25 MB)" }
          : { file: f, status: "pending" as const }
      ),
    ]);
    // Auto-selecteer jaar-map voor foto's/video's als er nog geen map gekozen is
    setLocalFolder((current) => {
      if (current !== null || folderPath) return current;
      const year = new Date().getFullYear();
      const allImages = accepted.every((f) => f.type.startsWith("image/"));
      const allVideos = accepted.every((f) => f.type.startsWith("video/"));
      if (allImages) return `Content/Foto/${year}`;
      if (allVideos) return `Content/Video/${year}`;
      return current;
    });
  }, [folderPath]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop });

  async function uploadAll() {
    setUploading(true);
    let allDone = true;

    for (let i = 0; i < files.length; i++) {
      if (files[i].status === "done") continue;

      setFiles((prev) =>
        prev.map((f, idx) => (idx === i ? { ...f, status: "uploading" } : f))
      );

      const formData = new FormData();
      formData.append("file", files[i].file);
      formData.append("clientSlug", clientSlug);
      formData.append("folderPath", effectiveFolder);

      const res = await fetch("/api/files/upload", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        setFiles((prev) =>
          prev.map((f, idx) => (idx === i ? { ...f, status: "done" } : f))
        );
      } else {
        const err = await res.json().catch(() => ({ error: "Upload mislukt" }));
        setFiles((prev) =>
          prev.map((f, idx) =>
            idx === i ? { ...f, status: "error", error: err.error } : f
          )
        );
        allDone = false;
      }
    }

    setUploading(false);
    if (allDone) {
      setUploadSuccess(true);
      setTimeout(() => {
        setFiles([]);
        setLocalFolder(null);
        setShowFolderPicker(false);
        setUploadSuccess(false);
        onUploadComplete();
      }, 2000);
    }
  }

  function removeFile(idx: number) {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
  }

  const pendingCount = files.filter((f) => f.status !== "done").length;

  return (
    <div className="space-y-3">
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
          isDragActive
            ? "border-teal-400 bg-teal-50"
            : "border-slate-200 hover:border-teal-300 hover:bg-slate-50"
        }`}
      >
        <input {...getInputProps()} />
        <Upload className="mx-auto mb-2 text-slate-400" size={24} />
        <p className="text-sm text-slate-600">
          {isDragActive
            ? "Laat los om te uploaden..."
            : "Sleep bestanden hierheen of klik om te selecteren"}
        </p>
        {effectiveFolder ? (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setShowFolderPicker((v) => !v); }}
            className="mt-1 inline-flex items-center gap-1 text-xs text-teal-600 hover:text-teal-800 font-medium"
          >
            <FolderOpen size={12} />
            {effectiveFolder}
          </button>
        ) : (
          <p className="text-xs text-slate-400 mt-1">Kies een map na het selecteren van bestanden</p>
        )}
      </div>

      {uploadSuccess && (
        <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
          <CheckCircle2 size={16} className="text-green-600 shrink-0" />
          <p className="text-sm font-medium text-green-700">Bestanden succesvol geüpload!</p>
        </div>
      )}

      {files.length > 0 && !uploadSuccess && (
        <div className="space-y-2">
          {files.map((f, idx) => (
            <div
              key={idx}
              className={`flex items-center gap-3 p-2 bg-white border rounded-lg ${
                f.status === "pending" ? "border-amber-200 bg-amber-50" : "border-slate-100"
              }`}
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm text-slate-800 truncate">{f.file.name}</p>
                <p className="text-xs text-slate-400">
                  {(f.file.size / 1024 / 1024).toFixed(1)} MB
                </p>
                {f.status === "error" && f.error && (
                  <p className="text-xs text-red-600 mt-0.5">{f.error}</p>
                )}
              </div>
              {f.status === "done" && <CheckCircle2 size={16} className="text-green-500 shrink-0" />}
              {f.status === "error" && <AlertCircle size={16} className="text-red-500 shrink-0" />}
              {f.status === "uploading" && (
                <div className="w-4 h-4 border-2 border-teal-500 border-t-transparent rounded-full animate-spin shrink-0" />
              )}
              {f.status === "pending" && (
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="flex items-center gap-1 text-xs text-amber-700 font-medium">
                    <Clock size={11} />
                    Wacht op bevestiging
                  </span>
                  <button onClick={() => removeFile(idx)} className="text-slate-400 hover:text-slate-600 ml-1">
                    <X size={14} />
                  </button>
                </div>
              )}
            </div>
          ))}

          {pendingCount > 0 && (
            <div className="space-y-2">
              {needsFolderPick || showFolderPicker ? (
                <div className="border border-slate-200 rounded-xl p-4 bg-white space-y-2">
                  <p className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
                    <FolderOpen size={13} />
                    {needsFolderPick ? "Kies een bestemmingsmap om te uploaden" : "Kies een andere map"}
                  </p>
                  <div className="max-h-48 overflow-y-auto">
                    <FolderTree
                      nodes={folders}
                      selectedPath={localFolder ?? ""}
                      onSelect={(path) => { setLocalFolder(path); setShowFolderPicker(false); }}
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <p className="text-xs text-amber-700 font-medium text-center">
                    Stap 2 van 2 — klik hieronder om de upload te bevestigen
                  </p>
                  <button
                    onClick={uploadAll}
                    disabled={uploading}
                    className="w-full py-3 flex items-center justify-center gap-2 bg-teal-700 text-white text-sm font-medium rounded-lg hover:bg-teal-800 disabled:opacity-60 transition-colors shadow-sm"
                  >
                    <Upload size={15} />
                    {uploading ? "Uploaden..." : `${pendingCount} bestand(en) uploaden naar ${effectiveFolder || "root"}`}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
