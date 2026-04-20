import { getStorageConfig } from "@/actions/admin/storage";
import { StorageSettings } from "@/components/admin/StorageSettings";

export default async function AdminInstellingenPage({
  searchParams,
}: {
  searchParams: Promise<{ storage_connected?: string; storage_error?: string }>;
}) {
  const params = await searchParams;
  const storageConfig = await getStorageConfig();

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Systeeminstellingen</h1>
        <p className="text-sm text-slate-500 mt-1">Globale instellingen voor de Content Hub</p>
      </div>

      <div className="bg-white rounded-xl border border-slate-100 p-6 space-y-6">
        <div>
          <h2 className="text-sm font-semibold text-slate-700 mb-3">Deellinks standaard</h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-700">Standaard vervalduur</p>
                <p className="text-xs text-slate-400">Hoeveel dagen links standaard geldig zijn</p>
              </div>
              <select className="text-sm border border-slate-200 rounded-lg px-3 py-1.5">
                <option>7 dagen</option>
                <option>14 dagen</option>
                <option>30 dagen</option>
              </select>
            </div>
          </div>
        </div>

        <div className="border-t border-slate-100 pt-6">
          <h2 className="text-sm font-semibold text-slate-700 mb-4">Cloudopslag</h2>
          <StorageSettings
            current={storageConfig}
            connectedNotice={params.storage_connected === "1"}
            errorNotice={params.storage_error}
          />
        </div>
      </div>
    </div>
  );
}
