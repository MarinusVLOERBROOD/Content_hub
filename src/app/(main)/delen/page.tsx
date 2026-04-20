import { getShareLinks } from "@/actions/shares";
import { NewShareFormClient } from "@/components/delen/NewShareFormClient";
import { ShareLinkCard } from "@/components/delen/ShareLinkCard";

export default async function DelenPage() {
  const links = await getShareLinks();

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Bestanden delen</h1>
        <p className="text-sm text-slate-500 mt-1">
          Selecteer bestanden en stuur een beveiligde downloadlink
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* New share form */}
        <NewShareFormClient />

        {/* Sent links */}
        <div>
          <h2 className="text-sm font-semibold text-slate-700 mb-3">
            Verzonden links ({links.length})
          </h2>
          {links.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-100 p-8 text-center text-slate-400">
              <p className="text-sm">Nog geen links verstuurd</p>
            </div>
          ) : (
            <div className="space-y-3">
              {links.map((link) => (
                <ShareLinkCard key={link.id} link={link as any} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
