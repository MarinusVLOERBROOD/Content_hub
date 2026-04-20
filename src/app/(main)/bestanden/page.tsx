import { redirect } from "next/navigation";
import { getClients } from "@/actions/clients";
import { ClientSidebar } from "@/components/bestanden/ClientSidebar";

export default async function BestandenPage() {
  const clients = await getClients();

  if (clients.length > 0) {
    redirect(`/bestanden/${clients[0].slug}`);
  }

  return (
    <div className="flex h-full">
      <ClientSidebar clients={clients} />
      <div className="flex-1 flex items-center justify-center text-center p-8">
        <div>
          <h2 className="text-lg font-semibold text-slate-700 mb-2">
            Geen klanten
          </h2>
          <p className="text-sm text-slate-400">
            Klik op het + icoon om een eerste klant aan te maken.
          </p>
        </div>
      </div>
    </div>
  );
}
