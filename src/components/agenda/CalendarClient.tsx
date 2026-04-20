"use client";

import { useState, useMemo } from "react";
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  format,
  addMonths,
  subMonths,
  addWeeks,
  subWeeks,
  addDays,
  subDays,
  parseISO,
  isWithinInterval,
  startOfDay,
  endOfDay,
} from "date-fns";
import { nl } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { EventModal } from "./EventModal";

interface EventTag { name: string; color: string; }
interface User { id: string; name: string; color: string; }

const userColorClass: Record<string, string> = {
  teal: "bg-teal-500",
  blue: "bg-blue-500",
  purple: "bg-purple-500",
  red: "bg-red-500",
  orange: "bg-orange-500",
  green: "bg-green-500",
};
interface ClientItem { id: string; name: string; }

interface CalEvent {
  id: string;
  title: string;
  description?: string | null;
  startAt: string;
  endAt: string;
  allDay: boolean;
  color: string;
  creatorId: string;
  creator: User;
  clientId?: string | null;
  client?: ClientItem | null;
  attendees: { user: User }[];
  tags: EventTag[];
}

interface TaskDeadline {
  id: string;
  title: string;
  dueAt: string;
  assigneeColor: string;
  assigneeName: string;
  userId: string;
  clientId?: string | null;
}

interface CalendarClientProps {
  events: CalEvent[];
  taskDeadlines: TaskDeadline[];
  users: User[];
  clients: ClientItem[];
  currentUserId: string;
}

type View = "month" | "week" | "day";


export function CalendarClient({ events, taskDeadlines, users, clients, currentUserId }: CalendarClientProps) {
  const [view, setView] = useState<View>("month");
  const [current, setCurrent] = useState(new Date());
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalEvent | null>(null);
  const [defaultDate, setDefaultDate] = useState<Date>(new Date());
  const [showDeadlines, setShowDeadlines] = useState(true);
  const [filterClient, setFilterClient] = useState("");
  const [visibleUsers, setVisibleUsers] = useState<Set<string>>(new Set([currentUserId]));

  function navigate(dir: "prev" | "next") {
    if (view === "month") setCurrent(dir === "prev" ? subMonths(current, 1) : addMonths(current, 1));
    if (view === "week") setCurrent(dir === "prev" ? subWeeks(current, 1) : addWeeks(current, 1));
    if (view === "day") setCurrent(dir === "prev" ? subDays(current, 1) : addDays(current, 1));
  }

  function openCreate(date: Date) {
    setSelectedEvent(null);
    setDefaultDate(date);
    setModalOpen(true);
  }

  function openEdit(event: CalEvent) {
    setSelectedEvent(event);
    setModalOpen(true);
  }

  const filteredEvents = useMemo(
    () =>
      events.filter((e) => {
        const isCreator = e.creatorId === currentUserId;
        const attendeeIds = e.attendees.map((a) => a.user.id);
        const anyVisible = attendeeIds.some((id) => visibleUsers.has(id)) || (isCreator && visibleUsers.has(currentUserId));
        if (!anyVisible) return false;
        if (filterClient && e.clientId !== filterClient) return false;
        return true;
      }),
    [events, visibleUsers, currentUserId, filterClient]
  );

  function getEventsForDay(day: Date) {
    return filteredEvents.filter((e) => {
      const start = parseISO(e.startAt);
      const end = parseISO(e.endAt);
      return isWithinInterval(day, { start: startOfDay(start), end: endOfDay(end) });
    });
  }

  function getDeadlinesForDay(day: Date) {
    if (!showDeadlines) return [];
    return taskDeadlines.filter(
      (t) => isSameDay(parseISO(t.dueAt), day) && visibleUsers.has(t.userId)
    );
  }

  const headerTitle =
    view === "month"
      ? format(current, "MMMM yyyy", { locale: nl })
      : view === "week"
      ? `${format(startOfWeek(current, { locale: nl }), "d MMM", { locale: nl })} – ${format(endOfWeek(current, { locale: nl }), "d MMM yyyy", { locale: nl })}`
      : format(current, "EEEE d MMMM yyyy", { locale: nl });

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="bg-white border-b border-slate-100 px-6 py-3 flex items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-2">
          <button onClick={() => navigate("prev")} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500">
            <ChevronLeft size={18} />
          </button>
          <h2 className="text-base font-semibold text-slate-800 min-w-48 text-center capitalize">
            {headerTitle}
          </h2>
          <button onClick={() => navigate("next")} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500">
            <ChevronRight size={18} />
          </button>
          <button
            onClick={() => setCurrent(new Date())}
            className="px-3 py-1 text-xs border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600 ml-2"
          >
            Vandaag
          </button>
        </div>

        <div className="flex items-center gap-3">
          {/* Client filter */}
          {clients.length > 0 && (
            <select
              value={filterClient}
              onChange={(e) => setFilterClient(e.target.value)}
              className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              <option value="">Alle klanten</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          )}

          {/* Show deadlines toggle */}
          <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer">
            <input
              type="checkbox"
              checked={showDeadlines}
              onChange={(e) => setShowDeadlines(e.target.checked)}
              className="rounded"
            />
            Deadlines tonen
          </label>

          {/* View toggle */}
          <div className="flex border border-slate-200 rounded-lg overflow-hidden">
            {(["month", "week", "day"] as View[]).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                  view === v ? "bg-teal-600 text-white" : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                {v === "month" ? "Maand" : v === "week" ? "Week" : "Dag"}
              </button>
            ))}
          </div>

          <button
            onClick={() => openCreate(current)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-600 text-white text-sm rounded-lg hover:bg-teal-700"
          >
            <Plus size={14} />
            Nieuw
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Calendar grid */}
        <div className="flex-1 overflow-auto">
          {view === "month" && (
            <MonthView
              current={current}
              getEventsForDay={getEventsForDay}
              getDeadlinesForDay={getDeadlinesForDay}
              onDayClick={openCreate}
              onEventClick={openEdit}
            />
          )}
          {view === "week" && (
            <WeekView
              current={current}
              getEventsForDay={getEventsForDay}
              getDeadlinesForDay={getDeadlinesForDay}
              onDayClick={openCreate}
              onEventClick={openEdit}
            />
          )}
          {view === "day" && (
            <DayView
              current={current}
              getEventsForDay={getEventsForDay}
              getDeadlinesForDay={getDeadlinesForDay}
              onDayClick={openCreate}
              onEventClick={openEdit}
            />
          )}
        </div>

        {/* Colleague toggle sidebar */}
        {users.length > 1 && (
          <div className="w-48 shrink-0 border-l border-slate-100 bg-white p-4">
            <p className="text-xs font-semibold text-slate-500 uppercase mb-3">Collega&apos;s</p>
            {users.map((u) => (
              <label key={u.id} className="flex items-center gap-2 mb-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={visibleUsers.has(u.id)}
                  onChange={() => {
                    setVisibleUsers((prev) => {
                      const next = new Set(prev);
                      if (next.has(u.id)) next.delete(u.id);
                      else next.add(u.id);
                      return next;
                    });
                  }}
                  className="rounded"
                />
                <span className={`w-3 h-3 rounded-full shrink-0 ${userColorClass[u.color] ?? "bg-teal-500"}`} />
                <span className="text-sm text-slate-700">{u.name}</span>
                {u.id === currentUserId && <span className="text-xs text-slate-400">(jij)</span>}
              </label>
            ))}
          </div>
        )}
      </div>

      <EventModal
        key={selectedEvent?.id ?? defaultDate.toISOString()}
        open={modalOpen}
        onClose={() => { setModalOpen(false); setSelectedEvent(null); }}
        event={selectedEvent}
        defaultDate={defaultDate}
        users={users}
        clients={clients}
        currentUserId={currentUserId}
      />
    </div>
  );
}

// ─── Month View ───────────────────────────────────────────────────────────────

function MonthView({
  current,
  getEventsForDay,
  getDeadlinesForDay,
  onDayClick,
  onEventClick,
}: {
  current: Date;
  getEventsForDay: (d: Date) => any[];
  getDeadlinesForDay: (d: Date) => any[];
  onDayClick: (d: Date) => void;
  onEventClick: (e: any) => void;
}) {
  const monthStart = startOfMonth(current);
  const monthEnd = endOfMonth(current);
  const calStart = startOfWeek(monthStart, { locale: nl });
  const calEnd = endOfWeek(monthEnd, { locale: nl });
  const days = eachDayOfInterval({ start: calStart, end: calEnd });
  const weekDays = ["Ma", "Di", "Wo", "Do", "Vr", "Za", "Zo"];

  return (
    <div className="p-4">
      {/* Week day headers */}
      <div className="grid grid-cols-7 mb-1">
        {weekDays.map((d) => (
          <div key={d} className="text-xs font-semibold text-slate-400 text-center py-2">
            {d}
          </div>
        ))}
      </div>

      {/* Days grid */}
      <div className="grid grid-cols-7 gap-px bg-slate-100 border border-slate-100 rounded-xl overflow-hidden">
        {days.map((day) => {
          const dayEvents = getEventsForDay(day);
          const deadlines = getDeadlinesForDay(day);
          const isToday = isSameDay(day, new Date());
          const inMonth = isSameMonth(day, current);

          return (
            <div
              key={day.toISOString()}
              className={`bg-white min-h-24 p-2 cursor-pointer hover:bg-slate-50 transition-colors ${!inMonth ? "opacity-40" : ""}`}
              onClick={() => onDayClick(day)}
            >
              <span
                className={`inline-flex w-7 h-7 items-center justify-center rounded-full text-sm mb-1 ${
                  isToday ? "bg-teal-600 text-white font-bold" : "text-slate-700"
                }`}
              >
                {format(day, "d")}
              </span>

              <div className="space-y-0.5">
                {dayEvents.slice(0, 3).map((e) => (
                  <button
                    key={e.id}
                    onClick={(ev) => { ev.stopPropagation(); onEventClick(e); }}
                    className={`w-full text-left px-1.5 py-0.5 rounded text-xs text-white truncate ${userColorClass[e.creator.color] ?? "bg-teal-500"}`}
                  >
                    <span className="flex items-center gap-1 min-w-0">
                      <span className="flex gap-0.5 shrink-0">
                        {e.attendees.slice(0, 3).map((a: { user: User }) => (
                          <span key={a.user.id} className={`w-2 h-2 rounded-full border border-white/50 ${userColorClass[a.user.color] ?? "bg-white/50"}`} />
                        ))}
                      </span>
                      <span className="truncate">
                        {e.client ? `[${e.client.name}] ` : ""}
                        {e.allDay ? e.title : `${format(parseISO(e.startAt), "HH:mm")} ${e.title}`}
                      </span>
                    </span>
                  </button>
                ))}
                {dayEvents.length > 3 && (
                  <p className="text-xs text-slate-400 pl-1">+{dayEvents.length - 3} meer</p>
                )}
                {deadlines.map((t) => (
                  <div key={t.id} className="w-full flex items-center gap-1 px-1.5 py-0.5 rounded text-xs bg-slate-100 text-slate-600 truncate">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${userColorClass[t.assigneeColor] ?? "bg-orange-400"}`} />
                    <span className="truncate">⏰ {t.title}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Week View ────────────────────────────────────────────────────────────────

function WeekView({
  current,
  getEventsForDay,
  getDeadlinesForDay,
  onDayClick,
  onEventClick,
}: {
  current: Date;
  getEventsForDay: (d: Date) => any[];
  getDeadlinesForDay: (d: Date) => any[];
  onDayClick: (d: Date) => void;
  onEventClick: (e: any) => void;
}) {
  const weekStart = startOfWeek(current, { locale: nl });
  const days = eachDayOfInterval({ start: weekStart, end: endOfWeek(weekStart, { locale: nl }) });

  return (
    <div className="p-4">
      <div className="grid grid-cols-7 gap-3">
        {days.map((day) => {
          const dayEvents = getEventsForDay(day);
          const deadlines = getDeadlinesForDay(day);
          const isToday = isSameDay(day, new Date());

          return (
            <div key={day.toISOString()} className="min-h-64">
              <div
                className={`text-center mb-2 cursor-pointer`}
                onClick={() => onDayClick(day)}
              >
                <p className="text-xs text-slate-400 uppercase">
                  {format(day, "EEE", { locale: nl })}
                </p>
                <span
                  className={`inline-flex w-8 h-8 items-center justify-center rounded-full text-sm font-medium ${
                    isToday ? "bg-teal-600 text-white" : "text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  {format(day, "d")}
                </span>
              </div>

              <div className="space-y-1">
                {dayEvents.map((e) => (
                  <button
                    key={e.id}
                    onClick={() => onEventClick(e)}
                    className={`w-full text-left px-2 py-1.5 rounded-lg text-xs text-white ${userColorClass[e.creator.color] ?? "bg-teal-500"}`}
                  >
                    <div className="flex items-center gap-1 mb-0.5">
                      {e.attendees.slice(0, 4).map((a: { user: User }) => (
                        <span key={a.user.id} className={`w-2.5 h-2.5 rounded-full border border-white/60 shrink-0 ${userColorClass[a.user.color] ?? "bg-white/50"}`} />
                      ))}
                    </div>
                    <p className="font-medium truncate">{e.title}</p>
                    {e.client && <p className="text-xs opacity-70 truncate">{e.client.name}</p>}
                    {!e.allDay && (
                      <p className="opacity-80">
                        {format(parseISO(e.startAt), "HH:mm")} – {format(parseISO(e.endAt), "HH:mm")}
                      </p>
                    )}
                  </button>
                ))}
                {deadlines.map((t) => (
                  <div key={t.id} className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs bg-slate-100 text-slate-600">
                    <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${userColorClass[t.assigneeColor] ?? "bg-orange-400"}`} />
                    <span className="truncate">⏰ {t.title}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Day View ─────────────────────────────────────────────────────────────────

function DayView({
  current,
  getEventsForDay,
  getDeadlinesForDay,
  onDayClick,
  onEventClick,
}: {
  current: Date;
  getEventsForDay: (d: Date) => any[];
  getDeadlinesForDay: (d: Date) => any[];
  onDayClick: (d: Date) => void;
  onEventClick: (e: any) => void;
}) {
  const dayEvents = getEventsForDay(current);
  const deadlines = getDeadlinesForDay(current);
  const isToday = isSameDay(current, new Date());

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-4">
        <div className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold ${isToday ? "bg-teal-600 text-white" : "bg-slate-100 text-slate-700"}`}>
          {format(current, "d")}
        </div>
        <div>
          <p className="font-semibold text-slate-800 capitalize">
            {format(current, "EEEE", { locale: nl })}
          </p>
          <p className="text-sm text-slate-400">{format(current, "d MMMM yyyy", { locale: nl })}</p>
        </div>
        <button
          onClick={() => onDayClick(current)}
          className="ml-auto flex items-center gap-1.5 px-3 py-1.5 text-sm border border-slate-200 rounded-lg hover:bg-slate-50"
        >
          <Plus size={14} />
          Afspraak
        </button>
      </div>

      {dayEvents.length === 0 && deadlines.length === 0 ? (
        <p className="text-center text-slate-400 text-sm py-8">Geen afspraken vandaag</p>
      ) : (
        <div className="space-y-3">
          {dayEvents.map((e) => (
            <button
              key={e.id}
              onClick={() => onEventClick(e)}
              className={`w-full text-left p-4 rounded-xl text-white ${userColorClass[e.creator.color] ?? "bg-teal-500"}`}
            >
              <div className="flex items-center gap-2 mb-2">
                {e.attendees.map((a: { user: User }) => (
                  <span key={a.user.id} className="flex items-center gap-1.5 text-xs text-white/80">
                    <span className={`w-3 h-3 rounded-full border-2 border-white/50 shrink-0 ${userColorClass[a.user.color] ?? "bg-white/50"}`} />
                    {a.user.name.split(" ")[0]}
                  </span>
                ))}
              </div>
              <p className="font-semibold">{e.title}</p>
              {e.client && <p className="text-sm opacity-70 mt-0.5">{e.client.name}</p>}
              {!e.allDay && (
                <p className="text-sm opacity-80 mt-0.5">
                  {format(parseISO(e.startAt), "HH:mm")} – {format(parseISO(e.endAt), "HH:mm")}
                </p>
              )}
              {e.description && <p className="text-sm opacity-80 mt-1">{e.description}</p>}
            </button>
          ))}
          {deadlines.map((t) => (
            <div key={t.id} className="flex items-center gap-3 p-4 rounded-xl bg-white border border-slate-200">
              <span className={`w-4 h-4 rounded-full shrink-0 ${userColorClass[t.assigneeColor] ?? "bg-orange-400"}`} />
              <div>
                <p className="text-sm font-medium text-slate-800">⏰ Deadline: {t.title}</p>
                <p className="text-xs text-slate-400 mt-0.5">{t.assigneeName}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
