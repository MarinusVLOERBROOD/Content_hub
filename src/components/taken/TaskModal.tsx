"use client";

import { useState, useTransition } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { createTask, updateTask, deleteTask } from "@/actions/tasks";
import { Trash2, RefreshCw } from "lucide-react";
import { getRecurrencePreview, type RecurrenceRule } from "@/lib/recurrence";
import { userColorClass } from "@/lib/colors";
import { useToast } from "@/contexts/ToastContext";

interface User { id: string; name: string; color?: string; }
interface ClientItem { id: string; name: string; slug: string; }

interface TaskData {
  id?: string;
  title: string;
  description?: string | null;
  status: string;
  priority: string;
  dueAt?: Date | null;
  clientId?: string | null;
  assignees?: { userId: string }[];
  recurrenceRule?: string | null;
  parentId?: string | null;
}

interface TaskModalProps {
  open: boolean;
  onClose: () => void;
  onCreated?: (task: any) => void;
  onDeleted?: (id: string, scope: "one" | "all") => void;
  task?: TaskData | null;
  defaultStatus?: string;
  users: User[];
  clients: ClientItem[];
}


export function TaskModal({ open, onClose, onCreated, onDeleted, task, defaultStatus = "todo", users, clients }: TaskModalProps) {
  const isEdit = !!task?.id;
  const isRecurring = !!(task?.recurrenceRule);

  const [title, setTitle] = useState(task?.title ?? "");
  const [description, setDescription] = useState(task?.description ?? "");
  const [status, setStatus] = useState(task?.status ?? defaultStatus);
  const [priority, setPriority] = useState(task?.priority ?? "medium");
  const [dueAt, setDueAt] = useState(
    task?.dueAt ? new Date(task.dueAt).toISOString().slice(0, 10) : ""
  );
  const [clientId, setClientId] = useState(task?.clientId ?? "");
  const [assigneeIds, setAssigneeIds] = useState<string[]>(
    task?.assignees?.map((a) => a.userId) ?? []
  );
  const [recurrenceRule, setRecurrenceRule] = useState<RecurrenceRule | "">("");
  const [recurrenceEndAt, setRecurrenceEndAt] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const { addToast } = useToast();

  function toggleAssignee(userId: string) {
    setAssigneeIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError("Titel is verplicht");
      return;
    }

    startTransition(async () => {
      try {
        const data = {
          title,
          description: description || undefined,
          status: status as any,
          priority: priority as any,
          dueAt: dueAt ? new Date(dueAt).toISOString() : null,
          clientId: clientId || null,
          assigneeIds,
          recurrenceRule: recurrenceRule || null,
          recurrenceEndAt: recurrenceEndAt ? new Date(recurrenceEndAt).toISOString() : null,
        };
        const result = isEdit
          ? await updateTask({ id: task!.id!, ...data })
          : await createTask(data);
        if (result?.error) setError(result.error);
        else {
          if (!isEdit && result?.task) onCreated?.(result.task);
          onClose();
        }
      } catch {
        setError("Er is iets misgegaan. Probeer het opnieuw.");
      }
    });
  }

  function handleDelete(scope: "one" | "all") {
    startTransition(async () => {
      if (task?.id) {
        await deleteTask(task.id, scope);
        onDeleted?.(task.id, scope);
        addToast({ message: scope === "all" ? "Alle herhalingen verwijderd" : "Taak verwijderd" });
      }
      onClose();
    });
  }

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? "Taak bewerken" : "Nieuwe taak"} width="max-w-md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Titel"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          placeholder="Bijv. Offerte opmaken"
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

        <div className="grid grid-cols-2 gap-3">
          <Select
            label="Status"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            options={[
              { value: "todo", label: "Te doen" },
              { value: "doing", label: "Bezig" },
              { value: "review", label: "Review" },
              { value: "done", label: "Klaar" },
            ]}
          />
          <Select
            label="Prioriteit"
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
            options={[
              { value: "low", label: "Laag" },
              { value: "medium", label: "Middel" },
              { value: "high", label: "Hoog" },
            ]}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Deadline"
            type="date"
            value={dueAt}
            onChange={(e) => setDueAt(e.target.value)}
          />
          <Select
            label="Klant"
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            options={[
              { value: "", label: "Geen klant" },
              ...clients.map((c) => ({ value: c.id, label: c.name })),
            ]}
          />
        </div>

        {/* Toewijzen aan — meerdere personen */}
        <div>
          <label className="text-sm font-medium text-slate-700 block mb-2">Toewijzen aan</label>
          <div className="flex flex-wrap gap-1.5">
            {users.map((u) => {
              const active = assigneeIds.includes(u.id);
              return (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => toggleAssignee(u.id)}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                    active
                      ? "bg-teal-600 text-white border-teal-600"
                      : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full shrink-0 ${userColorClass[u.color ?? ""] ?? "bg-teal-500"}`} />
                  {u.name.split(" ")[0]}
                </button>
              );
            })}
          </div>
          {!isEdit && (
            <p className="text-xs text-slate-400 mt-1.5">
              Jij bent de aanmaker van deze taak. Klik op namen om uitvoerders te selecteren.
            </p>
          )}
        </div>

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
              {recurrenceRule && dueAt && (
                <p className="text-xs text-teal-700 mt-1.5">
                  Herhaalt {recurrenceRule === "daily" ? "elke dag" : recurrenceRule === "weekly" ? `elke week op ${new Date(dueAt + "T12:00").toLocaleDateString("nl-NL", { weekday: "long" })}` : "elke maand"}
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
                {recurrenceEndAt && dueAt && (() => {
                  const preview = getRecurrencePreview(dueAt + "T12:00", recurrenceRule, recurrenceEndAt + "T23:59");
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

        {/* Badge when editing a recurring task */}
        {isEdit && isRecurring && (
          <div className="flex items-center gap-1.5 text-xs text-teal-700 bg-teal-50 border border-teal-200 rounded-lg px-3 py-2">
            <RefreshCw size={12} />
            Herhalende taak ({task.recurrenceRule === "daily" ? "dagelijks" : task.recurrenceRule === "weekly" ? "wekelijks" : "maandelijks"})
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
