"use client";

import { useState } from "react";
import {
  FileText,
  Image,
  Video,
  File,
  Eye,
  Trash2,
  MoreHorizontal,
  Pencil,
} from "lucide-react";
import { FilePreviewModal } from "./FilePreviewModal";
import { DeleteFileDialog } from "./DeleteConfirmDialog";
import { renameFile } from "@/actions/files";
import { format } from "date-fns";
import { nl } from "date-fns/locale";

interface FileItem {
  id: string;
  name: string;
  originalName: string;
  mimeType: string;
  size: number;
  relativePath: string;
  uploadedAt: Date;
  uploadedBy: { name: string };
}

interface FileTableProps {
  files: FileItem[];
  searchQuery: string;
}

function fileIcon(mimeType: string) {
  if (mimeType.startsWith("image/")) return <Image size={16} className="text-blue-400" />;
  if (mimeType.startsWith("video/")) return <Video size={16} className="text-purple-400" />;
  if (mimeType === "application/pdf") return <FileText size={16} className="text-red-400" />;
  return <File size={16} className="text-slate-400" />;
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function FileTable({ files, searchQuery }: FileTableProps) {
  const [previewFile, setPreviewFile] = useState<FileItem | null>(null);
  const [deleteFile, setDeleteFile] = useState<FileItem | null>(null);
  const [renameFileItem, setRenameFileItem] = useState<FileItem | null>(null);
  const [newName, setNewName] = useState("");
  const [menuOpen, setMenuOpen] = useState<string | null>(null);

  const filtered = files.filter((f) =>
    f.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  async function handleRename() {
    if (!renameFileItem || !newName.trim()) return;
    await renameFile(renameFileItem.id, newName.trim());
    setRenameFileItem(null);
    setNewName("");
  }

  if (filtered.length === 0) {
    return (
      <div className="text-center py-16 text-slate-400">
        <File size={40} className="mx-auto mb-3 opacity-30" />
        <p className="text-sm">
          {searchQuery ? "Geen bestanden gevonden" : "Nog geen bestanden in deze map"}
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50">
              <th className="text-left px-4 py-3 text-xs font-medium text-slate-500">Naam</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-slate-500">Type</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-slate-500">Grootte</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-slate-500">Datum</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-slate-500">Door</th>
              <th className="w-20" />
            </tr>
          </thead>
          <tbody>
            {filtered.map((file) => (
              <tr
                key={file.id}
                className="border-b border-slate-50 hover:bg-slate-50 transition-colors"
              >
                <td className="px-4 py-3">
                  <button
                    onClick={() => setPreviewFile(file)}
                    className="flex items-center gap-2 text-slate-800 hover:text-teal-700 text-left"
                  >
                    {fileIcon(file.mimeType)}
                    <span className="truncate max-w-xs">{file.name}</span>
                  </button>
                </td>
                <td className="px-4 py-3 text-slate-500 text-xs uppercase">
                  {file.mimeType.split("/")[1] || file.mimeType}
                </td>
                <td className="px-4 py-3 text-slate-500">{formatSize(file.size)}</td>
                <td className="px-4 py-3 text-slate-500">
                  {format(new Date(file.uploadedAt), "d MMM yyyy", { locale: nl })}
                </td>
                <td className="px-4 py-3 text-slate-500">{file.uploadedBy.name}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1 justify-end relative">
                    <button
                      onClick={() => setPreviewFile(file)}
                      className="p-1.5 rounded hover:bg-teal-50 text-slate-400 hover:text-teal-600"
                      title="Preview"
                    >
                      <Eye size={14} />
                    </button>
                    <div className="relative">
                      <button
                        onClick={() => setMenuOpen(menuOpen === file.id ? null : file.id)}
                        className="p-1.5 rounded hover:bg-slate-100 text-slate-400"
                      >
                        <MoreHorizontal size={14} />
                      </button>
                      {menuOpen === file.id && (
                        <div className="absolute right-0 top-full mt-1 bg-white border border-slate-100 rounded-lg shadow-lg py-1 z-10 w-36">
                          <button
                            onClick={() => {
                              setNewName(file.name);
                              setRenameFileItem(file);
                              setMenuOpen(null);
                            }}
                            className="flex items-center gap-2 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 w-full"
                          >
                            <Pencil size={12} /> Hernoemen
                          </button>
                          <button
                            onClick={() => {
                              setDeleteFile(file);
                              setMenuOpen(null);
                            }}
                            className="flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 w-full"
                          >
                            <Trash2 size={12} /> Verwijderen
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Rename dialog */}
      {renameFileItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm">
            <h3 className="text-base font-semibold text-slate-900 mb-4">Bestand hernoemen</h3>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 mb-4"
              onKeyDown={(e) => e.key === "Enter" && handleRename()}
              autoFocus
            />
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setRenameFileItem(null)}
                className="px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50"
              >
                Annuleren
              </button>
              <button
                onClick={handleRename}
                className="px-4 py-2 text-sm bg-teal-600 text-white rounded-lg hover:bg-teal-700"
              >
                Opslaan
              </button>
            </div>
          </div>
        </div>
      )}

      <FilePreviewModal
        open={!!previewFile}
        onClose={() => setPreviewFile(null)}
        file={previewFile}
      />
      {deleteFile && (
        <DeleteFileDialog
          open={true}
          onClose={() => setDeleteFile(null)}
          file={deleteFile}
        />
      )}
    </>
  );
}
