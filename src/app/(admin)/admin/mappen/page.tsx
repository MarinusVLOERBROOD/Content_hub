import { getFolderTemplate } from "@/actions/admin/folderTemplate";
import { FolderTemplateEditor } from "@/components/admin/FolderTemplateEditor";

export default async function MappenPage() {
  const template = await getFolderTemplate();

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Mapstructuur</h1>
        <p className="text-sm text-slate-500 mt-1">
          Pas de standaard mappenstructuur aan die elke nieuwe klant automatisch krijgt
        </p>
      </div>

      <div className="bg-white rounded-xl border border-slate-100 p-6">
        <FolderTemplateEditor initialTree={template} />
      </div>
    </div>
  );
}
