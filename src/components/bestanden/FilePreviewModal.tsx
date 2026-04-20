"use client";

import { X, Download } from "lucide-react";
import { useEffect } from "react";

interface FilePreviewModalProps {
  open: boolean;
  onClose: () => void;
  file: {
    id: string;
    name: string;
    mimeType: string;
    size: number;
  } | null;
}

export function FilePreviewModal({ open, onClose, file }: FilePreviewModalProps) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open || !file) return null;

  const isImage = file.mimeType.startsWith("image/");
  const isPdf = file.mimeType === "application/pdf";
  const isVideo = file.mimeType.startsWith("video/");

  const previewUrl = `/api/files/${file.id}/preview`;
  const downloadUrl = `/api/files/${file.id}`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-semibold text-slate-900 truncate">{file.name}</h3>
            <p className="text-xs text-slate-400">
              {(file.size / 1024 / 1024).toFixed(2)} MB · {file.mimeType}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <a
              href={downloadUrl}
              download={file.name}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-teal-50 text-teal-700 rounded-lg hover:bg-teal-100"
            >
              <Download size={14} />
              Download
            </a>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Preview */}
        <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-slate-50 rounded-b-xl">
          {isImage && (
            <img
              src={previewUrl}
              alt={file.name}
              className="max-w-full max-h-full object-contain rounded"
            />
          )}
          {isPdf && (
            <iframe
              src={previewUrl}
              className="w-full h-full min-h-96"
              title={file.name}
            />
          )}
          {isVideo && (
            <video
              src={previewUrl}
              controls
              className="max-w-full max-h-full rounded"
            />
          )}
          {!isImage && !isPdf && !isVideo && (
            <div className="text-center text-slate-500">
              <p className="text-sm mb-2">Geen preview beschikbaar</p>
              <a
                href={downloadUrl}
                download={file.name}
                className="text-teal-600 text-sm underline"
              >
                Download bestand
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
