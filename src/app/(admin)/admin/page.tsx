import { db } from "@/lib/db";
import { Users, Files, Share2, CheckSquare } from "lucide-react";

export default async function AdminDashboard() {
  const [userCount, clientCount, fileCount, taskCount, activeLinkCount] = await Promise.all([
    db.user.count(),
    db.client.count(),
    db.file.count(),
    db.task.count(),
    db.shareLink.count({ where: { revokedAt: null, expiresAt: { gt: new Date() } } }),
  ]);

  const stats = [
    { label: "Gebruikers", value: userCount, icon: Users, color: "text-blue-600 bg-blue-50" },
    { label: "Klanten", value: clientCount, icon: Files, color: "text-teal-600 bg-teal-50" },
    { label: "Bestanden", value: fileCount, icon: Files, color: "text-purple-600 bg-purple-50" },
    { label: "Taken", value: taskCount, icon: CheckSquare, color: "text-orange-600 bg-orange-50" },
    { label: "Actieve links", value: activeLinkCount, icon: Share2, color: "text-green-600 bg-green-50" },
  ];

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Beheer overzicht</h1>
        <p className="text-sm text-slate-500 mt-1">Statistieken en beheer van de Content Hub</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-white rounded-xl border border-slate-100 p-5">
            <div className={`inline-flex p-2.5 rounded-xl ${stat.color} mb-3`}>
              <stat.icon size={20} />
            </div>
            <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
            <p className="text-sm text-slate-500">{stat.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
