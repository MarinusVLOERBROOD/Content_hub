import Link from "next/link";
import { Plus, Share2, Upload, CheckSquare, ExternalLink } from "lucide-react";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  format,
  isPast,
  formatDistanceToNow,
  eachDayOfInterval,
  addDays,
  startOfDay,
  endOfDay,
  isSameDay,
  isWithinInterval,
} from "date-fns";
import { nl } from "date-fns/locale";

function greeting(name: string) {
  const hour = new Date().getHours();
  const salutation = hour < 12 ? "Goedemorgen" : hour < 18 ? "Goedemiddag" : "Goedenavond";
  return `${salutation}, ${name.split(" ")[0]}`;
}

const userColorClass: Record<string, string> = {
  teal: "bg-teal-500",
  blue: "bg-blue-500",
  purple: "bg-purple-500",
  red: "bg-red-500",
  orange: "bg-orange-500",
  green: "bg-green-500",
};

export default async function DashboardPage() {
  const session = await requireAuth();

  const weekStart = startOfDay(new Date());
  const weekEnd = endOfDay(addDays(weekStart, 6));

  const [upcomingEvents, openTasks, activeLinks, recentFiles, weekDeadlines] = await Promise.all([
    db.event.findMany({
      where: {
        startAt: { lte: weekEnd },
        endAt: { gte: weekStart },
        OR: [
          { creatorId: session.userId },
          { attendees: { some: { userId: session.userId } } },
        ],
      },
      orderBy: { startAt: "asc" },
      take: 30,
      select: {
        id: true,
        title: true,
        startAt: true,
        endAt: true,
        allDay: true,
        creator: { select: { color: true } },
      },
    }),
    db.task.findMany({
      where: {
        OR: [
          { creatorId: session.userId },
          { assigneeId: session.userId },
        ],
        status: { not: "done" },
      },
      orderBy: [{ priority: "desc" }, { dueAt: "asc" }],
      take: 5,
      include: { assignee: { select: { name: true, color: true } } },
    }),
    db.shareLink.findMany({
      where: {
        createdById: session.userId,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { expiresAt: "asc" },
      take: 5,
      include: {
        files: { include: { file: { select: { name: true } } } },
        downloads: true,
      },
    }),
    db.file.findMany({
      orderBy: { uploadedAt: "desc" },
      take: 6,
      include: { client: { select: { name: true, slug: true } } },
    }),
    db.task.findMany({
      where: {
        dueAt: { gte: weekStart, lte: weekEnd },
        status: { not: "done" },
      },
      select: {
        id: true,
        title: true,
        dueAt: true,
        assignee: { select: { color: true, name: true } },
        creator: { select: { color: true, name: true } },
        assigneeId: true,
        creatorId: true,
      },
    }),
  ]);

  const priorityLabels: Record<string, string> = { high: "Hoog", medium: "Middel", low: "Laag" };
  const priorityColors: Record<string, string> = { high: "text-red-500", medium: "text-yellow-500", low: "text-green-500" };

  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

  function getEventsForDay(day: Date) {
    return upcomingEvents.filter((e) =>
      isWithinInterval(day, {
        start: startOfDay(new Date(e.startAt)),
        end: endOfDay(new Date(e.endAt)),
      })
    );
  }

  function getDeadlinesForDay(day: Date) {
    return weekDeadlines.filter((t) => t.dueAt && isSameDay(new Date(t.dueAt), day));
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{greeting(session.name)}</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {format(new Date(), "EEEE d MMMM yyyy", { locale: nl })}
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/taken" className="flex items-center gap-1.5 px-4 py-2 border border-slate-200 text-slate-600 text-sm rounded-lg hover:bg-slate-50">
            <Plus size={14} /> Taak toevoegen
          </Link>
          <Link href="/bestanden" className="flex items-center gap-1.5 px-4 py-2 border border-slate-200 text-slate-600 text-sm rounded-lg hover:bg-slate-50">
            <Upload size={14} /> Bestand uploaden
          </Link>
          <Link href="/delen" className="flex items-center gap-1.5 px-4 py-2 bg-teal-600 text-white text-sm rounded-lg hover:bg-teal-700">
            <Share2 size={14} /> Bestanden delen
          </Link>
        </div>
      </div>

      {/* Mini weekly agenda */}
      <div className="bg-white rounded-xl border border-slate-100 p-5 mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-slate-700">Deze week</h2>
          <Link href="/agenda" className="text-xs text-teal-600 hover:underline">Volledige agenda →</Link>
        </div>
        <div className="grid grid-cols-7 gap-2">
          {weekDays.map((day) => {
            const isToday = isSameDay(day, new Date());
            const dayEvents = getEventsForDay(day);
            const dayDeadlines = getDeadlinesForDay(day);
            const total = dayEvents.length + dayDeadlines.length;
            const maxSlots = 3;
            const overflow = total > maxSlots ? total - maxSlots : 0;
            return (
              <div key={day.toISOString()} className="min-w-0">
                <div className="text-center mb-1.5">
                  <p className="text-xs text-slate-400 uppercase">{format(day, "EEE", { locale: nl })}</p>
                  <span className={`inline-flex w-7 h-7 items-center justify-center rounded-full text-sm font-medium ${isToday ? "bg-teal-600 text-white" : "text-slate-600"}`}>
                    {format(day, "d")}
                  </span>
                </div>
                <div className="space-y-0.5">
                  {dayEvents.slice(0, maxSlots).map((e) => (
                    <div
                      key={e.id}
                      className={`px-1.5 py-0.5 rounded text-xs text-white truncate ${userColorClass[e.creator.color] ?? "bg-teal-500"}`}
                      title={e.title}
                    >
                      {e.allDay ? e.title : `${format(new Date(e.startAt), "HH:mm")} ${e.title}`}
                    </div>
                  ))}
                  {dayDeadlines.slice(0, Math.max(0, maxSlots - dayEvents.length)).map((t) => {
                    const ownerColor = t.assignee?.color ?? t.creator.color ?? "orange";
                    return (
                      <div
                        key={t.id}
                        className="flex items-center gap-1 px-1.5 py-0.5 rounded text-xs bg-orange-50 border border-orange-200 text-orange-700 truncate"
                        title={`Deadline: ${t.title}${t.assignee ? ` (${t.assignee.name})` : ""}`}
                      >
                        <span className={`w-2 h-2 rounded-full shrink-0 ${userColorClass[ownerColor] ?? "bg-orange-500"}`} />
                        <span className="truncate">{t.title}</span>
                      </div>
                    );
                  })}
                  {overflow > 0 && (
                    <p className="text-xs text-slate-400 pl-1">+{overflow} meer</p>
                  )}
                  {total === 0 && <div className="h-5" />}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 2-column stats row */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        {/* Open tasks */}
        <div className="bg-white rounded-xl border border-slate-100 p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-slate-700">Openstaande taken</h2>
            <Link href="/taken" className="text-xs text-teal-600 hover:underline">Alle →</Link>
          </div>
          {openTasks.length === 0 ? (
            <p className="text-xs text-slate-400">Geen openstaande taken</p>
          ) : (
            <div className="space-y-2">
              {openTasks.map((t) => (
                <div key={t.id} className="flex items-start gap-2">
                  <CheckSquare size={14} className="mt-0.5 text-slate-300 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm text-slate-800 truncate">{t.title}</p>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs ${priorityColors[t.priority]}`}>
                        {priorityLabels[t.priority]}
                      </span>
                      {t.dueAt && (
                        <span className={`text-xs ${isPast(new Date(t.dueAt)) ? "text-red-500" : "text-slate-400"}`}>
                          {format(new Date(t.dueAt), "d MMM", { locale: nl })}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Active share links */}
        <div className="bg-white rounded-xl border border-slate-100 p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-slate-700">Actieve deellinks</h2>
            <Link href="/delen" className="text-xs text-teal-600 hover:underline">Alle →</Link>
          </div>
          {activeLinks.length === 0 ? (
            <p className="text-xs text-slate-400">Geen actieve links</p>
          ) : (
            <div className="space-y-2">
              {activeLinks.map((l) => (
                <div key={l.id} className="flex items-start gap-2">
                  <ExternalLink size={14} className="mt-0.5 text-slate-300 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm text-slate-800 truncate">
                      {l.files[0]?.file.name ?? "Bestanden"}
                      {l.files.length > 1 && ` +${l.files.length - 1}`}
                    </p>
                    <p className="text-xs text-slate-400">
                      Verloopt {formatDistanceToNow(new Date(l.expiresAt), { locale: nl, addSuffix: true })}
                      · {l.downloads.length} downloads
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent files */}
      {recentFiles.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-slate-700">Recent geüpload</h2>
            <Link href="/bestanden" className="text-xs text-teal-600 hover:underline">Alle bestanden →</Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {recentFiles.map((f) => (
              <Link
                key={f.id}
                href={`/bestanden/${f.client.slug}`}
                className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl hover:bg-teal-50 transition-colors"
              >
                <div className="w-8 h-8 bg-teal-100 rounded-lg flex items-center justify-center shrink-0">
                  <Upload size={14} className="text-teal-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium text-slate-800 truncate">{f.name}</p>
                  <p className="text-xs text-slate-400">{f.client.name}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
