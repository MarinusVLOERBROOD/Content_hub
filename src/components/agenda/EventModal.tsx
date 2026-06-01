"use client";

import { useState, useTransition } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { createEvent, updateEvent, deleteEvent } from "@/actions/events";
import { useToast } from "@/contexts/ToastContext";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { Trash2, RefreshCw } from "lucide-react";
import { getRecurrencePreview, type RecurrenceRule } from "@/lib/recurrence";

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
  onDeleted?: (id: string, scope: "one" | "all") => void;
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
  onDeleted,
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
  const [recurrenceRule, setRecurrenceRule] = useState<RecurrenceRule | "">("");
  const [recurrenceEndAt, setRecurrenceEndAt] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const { addToast } = useToast();

  function toggleAttendee(id: string) {
    setAttendeeIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError("Titel is verplicht");
      return;
    }
    const startDate = new Date(startAt);
    const endDate = new Date(endAt);
    if (!startAt || isNaN(startDate.getTime())) {
      setError("Begintijd is verplicht");
      return;
    }
    if (!endAt || isNaN(endDate.getTime())) {
      setError("Eindtijd is verplicht");
      return;
    }

    startTransition(async () => {
      try {
        const data = {
          title,
          description: description || undefined,
          startAt: startDate.toISOString(),
          endAt: endDate.toISOString(),
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
      } catch {
        setError("Er is iets misgegaan. Probeer het opnieuw.");
      }
    });
  }

  function handleDelete(scope: "one" | "all") {
    startTransition(async () => {
      if (event?.id) {
        await deleteEvent(event.id, scope);
        onDeleted?.(event.id, scope);
        addToast({ message: scope === "all" ? "Alle herhalingen verwijderd" : "Afspraak verwijderd" });
      }
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
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-2">Herhaling</label>
              <div className="flex rounded-lg border border-slate-200 overflow-hidden">
                {(["", "daily", "weekly", "monthly"] as const).map((val, i) => {
                  const labels = ["Geen", "Dagelijks", "Wekelijks", "Maandelijks"];
                  const active = recurrenceRule === val;
                  return (
                    <button
                      key={val}
                      type="button"
                      onClick={() => { setRecurrenceRule(val); if (!val) setRecurrenceEndAt(""); }}
                      className={`flex-1 py-2 text-xs font-medium transition-colors ${i > 0 ? "border-l border-slate-200" : ""} ${
                        active
                          ? "bg-teal-600 text-white"
                          : "bg-white text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      {labels[i]}
                    </button>
                  );
                })}
              </div>
              {recurrenceRule && (
                <p className="text-xs text-teal-700 mt-1.5">
                  Herhaalt {recurrenceRule === "daily" ? "elke dag" : recurrenceRule === "weekly" ? `elke week op ${format(new Date(startAt), "EEEE", { locale: nl })}` : `elke maand op de ${format(new Date(startAt), "d")}e`}
                </p>
              )}
            </div>

            {recurrenceRule && (
              <div>
                <Input
                  label="Herhaling t/m"
                  type="date"
                  value={recurrenceEndAt}
                  onChange={(e) => setRecurrenceEndAt(e.target.value)}
                />
                <p className="text-xs text-slate-400 mt-1">De herhaling loopt t/m deze datum (inclusief)</p>
                {recurrenceEndAt && (() => {
                  const preview = getRecurrencePreview(startAt, recurrenceRule, recurrenceEndAt);
                  return preview.length > 0 ? (
                    <p className="text-xs text-slate-500 mt-1">
                      Geplande momenten: {preview.join(", ")}{preview.length === 4 ? "..." : ""}
                    </p>
                  ) : null;
                })()}
              </div>
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
                    className="rounded border-slate-300"
                  />
                  <span className="text-sm text-slate-700">
                    {u.name} {u.id === currentUserId && <span className="text-slate-400">(jij — optioneel)</span>}
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
