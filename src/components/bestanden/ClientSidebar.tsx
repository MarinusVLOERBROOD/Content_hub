"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Plus, Pencil, Trash2, Building2 } from "lucide-react";
import { ClientModal } from "./ClientModal";
import { DeleteClientDialog } from "./DeleteConfirmDialog";

interface Client {
  id: string;
  name: string;
  slug: string;
}

interface ClientSidebarProps {
  clients: Client[];
}

export function ClientSidebar({ clients }: ClientSidebarProps) {
  const pathname = usePathname();
  const [createOpen, setCreateOpen] = useState(false);
  const [editClient, setEditClient] = useState<Client | null>(null);
  const [deleteClient, setDeleteClient] = useState<Client | null>(null);

  return (
    <>
      <div className="w-full lg:w-52 shrink-0 bg-white border-b lg:border-b-0 lg:border-r border-slate-100 flex flex-row lg:flex-col h-auto lg:h-full overflow-x-auto lg:overflow-x-visible">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 shrink-0">
          <span className="text-sm font-semibold text-slate-700">Klanten</span>
          <button
            onClick={() => setCreateOpen(true)}
            className="p-1 rounded-md hover:bg-teal-50 text-teal-600 transition-colors"
            title="Nieuwe klant"
          >
            <Plus size={16} />
          </button>
        </div>

        <nav className="flex flex-row lg:flex-col overflow-x-auto lg:overflow-y-auto py-2 lg:flex-1 gap-1 lg:gap-0 px-2 lg:px-0">
          {clients.length === 0 && (
            <p className="text-xs text-slate-400 px-4 py-3">
              Nog geen klanten. Klik + om een klant toe te voegen.
            </p>
          )}
          {clients.map((client) => {
            const active = pathname.startsWith(`/bestanden/${client.slug}`);
            return (
              <div
                key={client.id}
                className={`group flex items-center gap-2 px-3 py-2 mx-2 rounded-lg transition-colors ${
                  active ? "bg-teal-50 text-teal-700" : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                <Link
                  href={`/bestanden/${client.slug}`}
                  className="flex items-center gap-2 flex-1 min-w-0"
                >
                  <Building2 size={14} className="shrink-0" />
                  <span className="text-sm truncate">{client.name}</span>
                </Link>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => setEditClient(client)}
                    className="p-0.5 rounded hover:bg-slate-200 text-slate-400 hover:text-slate-600"
                    title="Bewerken"
                  >
                    <Pencil size={12} />
                  </button>
                  <button
                    onClick={() => setDeleteClient(client)}
                    className="p-0.5 rounded hover:bg-red-100 text-slate-400 hover:text-red-600"
                    title="Verwijderen"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            );
          })}
        </nav>
      </div>

      <ClientModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
      />
      {editClient && (
        <ClientModal
          open={true}
          onClose={() => setEditClient(null)}
          client={editClient}
        />
      )}
      {deleteClient && (
        <DeleteClientDialog
          open={true}
          onClose={() => setDeleteClient(null)}
          client={deleteClient}
        />
      )}
    </>
  );
}
