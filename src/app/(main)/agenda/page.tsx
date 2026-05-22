import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { CalendarClient } from "@/components/agenda/CalendarClient";

export default async function AgendaPage() {
  const session = await requireAuth();

  const [events, users, tasks, clients] = await Promise.all([
    db.event.findMany({
      include: {
        creator: { select: { id: true, name: true, color: true } },
        attendees: { include: { user: { select: { id: true, name: true, color: true } } } },
        client: { select: { id: true, name: true } },
        tags: true,
      },
      orderBy: { startAt: "asc" },
    }),
    db.user.findMany({ select: { id: true, name: true, color: true }, orderBy: { name: "asc" } }),
    db.task.findMany({
      where: { dueAt: { not: null } },
      select: {
        id: true,
        title: true,
        dueAt: true,
        clientId: true,
        assignee: { select: { id: true, name: true, color: true } },
        creator: { select: { id: true, name: true, color: true } },
      },
      orderBy: { dueAt: "asc" },
    }),
    db.client.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);

  const serializedEvents = events.map((e) => ({
    id: e.id,
    title: e.title,
    description: e.description,
    startAt: e.startAt.toISOString(),
    endAt: e.endAt.toISOString(),
    allDay: e.allDay,
    color: e.color,
    creatorId: e.creatorId,
    creator: e.creator,
    clientId: e.clientId,
    client: e.client,
    attendees: e.attendees.map((a) => ({ user: a.user })),
    tags: e.tags,
    recurrenceRule: e.recurrenceRule,
    parentId: e.parentId,
  }));

  const taskDeadlines = tasks
    .filter((t) => t.dueAt)
    .map((t) => ({
      id: t.id,
      title: t.title,
      dueAt: t.dueAt!.toISOString(),
      assigneeColor: t.assignee?.color ?? t.creator.color,
      assigneeName: t.assignee?.name ?? t.creator.name,
      userId: t.assignee?.id ?? t.creator.id,
      clientId: t.clientId,
    }));

  return (
    <div className="h-full flex flex-col">
      <CalendarClient
        events={serializedEvents}
        taskDeadlines={taskDeadlines}
        users={users}
        clients={clients}
        currentUserId={session.userId}
      />
    </div>
  );
}
