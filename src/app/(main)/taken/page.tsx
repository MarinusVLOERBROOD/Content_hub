import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { KanbanBoard } from "@/components/taken/KanbanBoard";

export default async function TakenPage() {
  const session = await requireAuth();

  const [tasks, users, clients] = await Promise.all([
    db.task.findMany({
      include: {
        creator: { select: { id: true, name: true, color: true } },
        assignee: { select: { id: true, name: true, color: true } },
        client: { select: { id: true, name: true, slug: true } },
        tags: true,
      },
      orderBy: [{ status: "asc" }, { position: "asc" }],
    }),
    db.user.findMany({ select: { id: true, name: true, color: true }, orderBy: { name: "asc" } }),
    db.client.findMany({ select: { id: true, name: true, slug: true }, orderBy: { name: "asc" } }),
  ]);

  const serializedTasks = tasks.map((t) => ({
    ...t,
    dueAt: t.dueAt?.toISOString() ?? null,
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
  }));

  return (
    <div className="flex flex-col h-full">
      <div className="bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Taken</h1>
          <p className="text-sm text-slate-500 mt-0.5">Beheer je taken per status</p>
        </div>
      </div>
      <div className="flex-1 overflow-hidden">
        <KanbanBoard initialTasks={serializedTasks as any} users={users} clients={clients} currentUserId={session.userId} />
      </div>
    </div>
  );
}
