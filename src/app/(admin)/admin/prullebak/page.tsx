import { getTrashedFiles } from "@/actions/admin/trash";
import { TrashManager } from "@/components/admin/TrashManager";

export default async function AdminPrullebakPage() {
  const files = await getTrashedFiles();

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Prullebak</h1>
        <p className="text-sm text-slate-500 mt-1">
          Verwijderde bestanden — herstel ze of verwijder ze permanent van de schijf.
        </p>
      </div>

      <div className="bg-white rounded-xl border border-slate-100 p-6">
        <TrashManager files={files} />
      </div>
    </div>
  );
}
