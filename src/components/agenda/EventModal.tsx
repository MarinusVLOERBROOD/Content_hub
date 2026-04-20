"use client";

import { useState, useTransition } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { createEvent, updateEvent, deleteEvent } from "@/actions/events";
import { format } from "date-fns";
import { Trash2, RefreshCw } from "lucide-react";

interface User {
  id: string;
  name: string;
}

interface ClientItem {
  id: string;
  name: string;
}

interface EventData {
  id?: string;
  title: string;
  description?: string | null;
  startAt: Date | string;
  endAt: Date | string;
  allDay: boolean;
  color: string;
  clientId?: string | null;
  attendees?: { user: User }[];
  recurrenceRule?: string | null;
  parentId?: string | null;
}

interface EventModalProps {
  open: boolean;
  onClose: () => void;
  event?: EventData | null;
  defaultDate?: Date;
  users: User[];
  clients: ClientItem[];
  currentUserId: string;
}

function formatDateTimeLocal(d: Date) {
  return format(d, "yyyy-MM-dd'T'HH:mm");
}

export function EventModal({
  open,
  onClose,
  event,
  defaultDate,
  users,
  clients,
  currentUserId,
}: EventModalProps) {
  const isEdit = !!event?.id;
  const isRecurring = !!(event?.recurrenceRule);

  const defaultStart = event?.startAt ? new Date(event.startAt) : (defaultDate ?? new Date());
  const defaultEnd = event?.endAt ? new Date(event.endAt) : new Date((defaultDate ?? new Date()).getTime() + 3600000);

  const [title, setTitle] = useState(event?.title ?? "");
  const [description, setDescription] = useState(event?.description ?? "");
  const [startAt, setStartAt] = useState(formatDateTimeLocal(defaultStart));
  const [endAt, setEndAt] = useState(formatDateTimeLocal(defaultEnd));
  const [allDay, setAllDay] = useState(event?.allDay ?? false);
  const [clientId, setClientId] = useState(event?.clientId ?? "");
  const [attendeeIds, setAttendeeIds] = useState<string[]>(
    event?.attendees?.map((a) => a.user.id) ?? [currentUserId]
  );
  const [recurrenceRule, setRecurrenceRule] = useState("");
  const [recurrenceEndAt, setRecurrenceEndAt] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  function toggleAttendee(id: string) {
    if (id === currentUserId) return;
    setAttendeeIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const data = {
        title,
        description,
        startAt: new Date(startAt).toISOString(),
        endAt: new Date(endAt).toISOString(),
        allDay,
        clientId: clientId || null,
        attendeeIds,
        recurrenceRule: recurrenceRule || null,
        recurrenceEndAt: recurrenceEndAt ? new Date(recurrenceEndAt).toISOString() : null,
      };
      const result = isEdit
        ? await updateEvent({ id: event!.id!, ...data })
        : await createEvent(data);

      if (result?.error) setError(result.error);
      else onClose();
      return undefined;
    });
  }

  function handleDelete(scope: "one" | "all") {
    startTransition(async () => {
      if (event?.id) await deleteEvent(event.id, scope);
      onClose();
    });
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? "Afspraak bewerken" : "Nieuwe afspraak"}
      width="max-w-md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Titel"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          placeholder="Vergadering, deadline..."
        />

        <div>
          <label className="text-sm font-medium text-slate-700 block mb-1">Omschrijving</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
          />
        </div>

        <Select
          label="Klant (optioneel)"
          value={clientId}
          onChange={(e) => setClientId(e.target.value)}
          options={[
            { value: "", label: "Geen klant" },
            ...clients.map((c) => ({ value: c.id, label: c.name })),
          ]}
        />

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="allDay"
            checked={allDay}
            onChange={(e) => setAllDay(e.target.checked)}
            className="rounded border-slate-300"
          />
          <label htmlFor="allDay" className="text-sm text-slate-700">Hele dag</label>
        </div>

        {!allDay && (
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Begintijd"
              type="datetime-local"
              value={startAt}
              onChange={(e) => {
                const newStart = e.target.value;
                setStartAt(newStart);
                const oldDuration = new Date(endAt).getTime() - new Date(startAt).getTime();
                const newEnd = new Date(new Date(newStart).getTime() + Math.max(oldDuration, 3600000));
                setEndAt(formatDateTimeLocal(newEnd));
              }}
            />
            <Input
              label="Eindtijd"
              type="datetime-local"
              value={endAt}
              onChange={(e) => setEndAt(e.target.value)}
            />
          </div>
        )}
        {allDay && (
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Begindatum"
              type="date"
              value={startAt.substring(0, 10)}
              onChange={(e) => setStartAt(e.target.value + "T00:00")}
            />
            <Input
              label="Einddatum"
              type="date"
              value={endAt.substring(0, 10)}
              onChange={(e) => setEndAt(e.target.value + "T23:59")}
            />
          </div>
        )}

        {/* Recurrence — only in create mode */}
        {!isEdit && (
          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Herhaling"
              value={recurrenceRule}
              onChange={(e) => setRecurrenceRule(e.target.value)}
              options={[
                { value: "", label: "Geen herhaling" },
                { value: "daily", label: "Dagelijks" },
                { value: "weekly", label: "Wekelijks" },
                { value: "monthly", label: "Maandelijks" },
              ]}
            />
            {recurrenceRule && (
              <Input
                label="Herhaling t/m"
                type="date"
                value={recurrenceEndAt}
                onChange={(e) => setRecurrenceEndAt(e.target.value)}
              />
            )}
          </div>
        )}

        {/* Badge when editing a recurring event */}
        {isEdit && isRecurring && (
          <div className="flex items-center gap-1.5 text-xs text-teal-700 bg-teal-50 border border-teal-200 rounded-lg px-3 py-2">
            <RefreshCw size={12} />
            Herhalende afspraak ({event.recurrenceRule === "daily" ? "dagelijks" : event.recurrenceRule === "weekly" ? "wekelijks" : "maandelijks"})
          </div>
        )}

        {/* Attendees */}
        {users.length > 1 && (
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-2">Deelnemers</label>
            <div className="space-y-1">
              {users.map((u) => (
                <label key={u.id} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={attendeeIds.includes(u.id)}
                    onChange={() => toggleAttendee(u.id)}
                    disabled={u.id === currentUserId}
                    className="rounded border-slate-300"
                  />
                  <span className="text-sm text-slate-700">
                    {u.name} {u.id === currentUserId && "(jij)"}
                  </span>
                </label>
              ))}
            </div>
          </div>
        )}

        {error && <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

        <div className="flex items-center justify-between pt-2">
          {isEdit && !deleteConfirm && (
            <button
              type="button"
              onClick={() => setDeleteConfirm(true)}
              className="flex items-center gap-1.5 text-sm text-red-500 hover:text-red-700"
              disabled={isPending}
            >
              <Trash2 size={14} />
              Verwijderen
            </button>
          )}
          {isEdit && deleteConfirm && isRecurring && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-500">Verwijder:</span>
              <button
                type="button"
                onClick={() => handleDelete("one")}
                className="text-sm text-red-500 hover:text-red-700 underline"
                disabled={isPending}
              >
                Alleen deze
              </button>
              <button
                type="button"
                onClick={() => handleDelete("all")}
                className="text-sm text-red-500 hover:text-red-700 underline"
                disabled={isPending}
              >
                Alle herhalingen
              </button>
            </div>
          )}
          {isEdit && deleteConfirm && !isRecurring && (
            <button
              type="button"
              onClick={() => handleDelete("one")}
              className="flex items-center gap-1.5 text-sm text-red-500 hover:text-red-700"
              disabled={isPending}
            >
              <Trash2 size={14} />
              Zeker?
            </button>
          )}
          <div className={`flex gap-3 ${!isEdit ? "ml-auto" : ""}`}>
            <Button variant="secondary" type="button" onClick={onClose} disabled={isPending}>
              Annuleren
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Opslaan..." : isEdit ? "Opslaan" : "Aanmaken"}
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
