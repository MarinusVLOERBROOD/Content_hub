"use client";

import { useState, useEffect, useTransition, useCallback } from "react";
import { Search, ChevronRight } from "lucide-react";
import { ClientSidebar } from "@/components/bestanden/ClientSidebar";
import { FolderTree } from "@/components/bestanden/FolderTree";
import { FileTable } from "@/components/bestanden/FileTable";
import { FileUploadZone } from "@/components/bestanden/FileUploadZone";
import type { FolderNode } from "@/lib/client-folders";
import { use } from "react";

interface PageProps {
  params: Promise<{ clientSlug: string }>;
}

interface Client {
  id: string;
  name: string;
  slug: string;
}

export default function ClientBestandenPage({ params }: PageProps) {
  const { clientSlug } = use(params);
  const [clients, setClients] = useState<Client[]>([]);
  const [folderTree, setFolderTree] = useState<FolderNode[]>([]);
  const [selectedFolder, setSelectedFolder] = useState("");
  const [files, setFiles] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [clientsRes, treeRes, filesRes] = await Promise.all([
        fetch("/api/clients").then((r) => r.json()),
        fetch(`/api/clients/${clientSlug}/folders`).then((r) => r.json()),
        fetch(`/api/clients/${clientSlug}/files?folder=${encodeURIComponent(selectedFolder)}`).then((r) => r.json()),
      ]);
      setClients(clientsRes);
      setFolderTree(treeRes);
      setFiles(filesRes);
    } finally {
      setLoading(false);
    }
  }, [clientSlug, selectedFolder]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const currentClient = clients.find((c) => c.slug === clientSlug);
  const selectedFolderName = selectedFolder
    ? selectedFolder.split("/").pop()
    : currentClient?.name ?? clientSlug;

  return (
    <div className="flex h-full">
      {/* Client sidebar */}
      <ClientSidebar clients={clients} />

      {/* Folder tree */}
      <div className="w-52 shrink-0 bg-white border-r border-slate-100 flex flex-col">
        <div className="px-4 py-4 border-b border-slate-100">
          <p className="text-sm font-semibold text-slate-700">
            {currentClient?.name ?? clientSlug}
          </p>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {/* Root option */}
          <button
            onClick={() => setSelectedFolder("")}
            className={`flex items-center gap-2 w-full px-3 py-1.5 rounded-lg text-sm mb-1 ${
              selectedFolder === ""
                ? "bg-teal-50 text-teal-700 font-medium"
                : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            Alle bestanden
          </button>
          <FolderTree
            nodes={folderTree}
            selectedPath={selectedFolder}
            onSelect={setSelectedFolder}
          />
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Toolbar */}
        <div className="bg-white border-b border-slate-100 px-6 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-1.5 text-sm text-slate-500">
            <span>Bestanden</span>
            <ChevronRight size={14} />
            <span className="text-slate-800 font-medium">{selectedFolderName}</span>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
            <input
              type="text"
              placeholder="Zoeken..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 pr-4 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 w-48"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Upload zone */}
          <FileUploadZone
            clientSlug={clientSlug}
            folderPath={selectedFolder}
            onUploadComplete={loadData}
          />

          {/* File listing */}
          {loading ? (
            <div className="text-center py-8 text-slate-400 text-sm">Laden...</div>
          ) : (
            <FileTable files={files} searchQuery={search} />
          )}
        </div>
      </div>
    </div>
  );
}
