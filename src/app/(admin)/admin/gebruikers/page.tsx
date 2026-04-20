import { db } from "@/lib/db";
import { UserManagement } from "@/components/admin/UserManagement";

export default async function GebruikersPage() {
  const users = await db.user.findMany({
    select: { id: true, name: true, email: true, role: true, jobTitle: true, color: true, createdAt: true },
    orderBy: { name: "asc" },
  });

  const serialized = users.map((u) => ({
    ...u,
    createdAt: u.createdAt.toISOString(),
  }));

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Gebruikers</h1>
        <p className="text-sm text-slate-500 mt-1">Beheer accounts en toegangsrechten</p>
      </div>
      <UserManagement initialUsers={serialized} />
    </div>
  );
}
