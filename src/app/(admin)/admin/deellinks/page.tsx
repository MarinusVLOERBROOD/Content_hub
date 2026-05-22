import { getAllShareLinks } from "@/actions/admin/shares";
import { ShareLinkAdmin } from "@/components/admin/ShareLinkAdmin";

export default async function AdminDeellinksPage() {
  const links = await getAllShareLinks();

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Deellinks</h1>
        <p className="text-sm text-slate-500 mt-1">
          Beheer alle deellinks — heractiveer ingetrokken links of verwijder ze permanent.
        </p>
      </div>

      <div className="bg-white rounded-xl border border-slate-100 p-6">
        <ShareLinkAdmin links={links} />
      </div>
    </div>
  );
}
