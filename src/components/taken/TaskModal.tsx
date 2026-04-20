"use client";

import { useState, useTransition } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { createTask, updateTask, deleteTask } from "@/actions/tasks";
import { Trash2, RefreshCw } from "lucide-react";

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
  assigneeId?: string | null;
  recurrenceRule?: string | null;
  parentId?: string | null;
}

interface TaskModalProps {
  open: boolean;
  onClose: () => void;
  onCreated?: (task: any) => void;
  task?: TaskData | null;
  defaultStatus?: string;
  users: User[];
  clients: ClientItem[];
}

export function TaskModal({ open, onClose, onCreated, task, defaultStatus = "todo", users, clients }: TaskModalProps) {
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
  const [assigneeId, setAssigneeId] = useState(task?.assigneeId ?? "");
  const [recurrenceRule, setRecurrenceRule] = useState("");
  const [recurrenceEndAt, setRecurrenceEndAt] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const data = {
        title,
        description: description || undefined,
        status: status as any,
        priority: priority as any,
        dueAt: dueAt ? new Date(dueAt).toISOString() : null,
        clientId: clientId || null,
        assigneeId: assigneeId || null,
        recurrenceRule: recurrenceRule || null,
        recurrenceEndAt: recurrenceEndAt ? new Date(recurrenceEndAt).toISOString() : null,
      };
      const result = isEdit
        ? await updateTask({ id: task!.id!, ...data })
        : await createTask(data);

      if (result?.error) setError(result.error);
      else {
        if (!isEdit && result.task) onCreated?.(result.task);
        onClose();
      }
    });
  }

  function handleDelete(scope: "one" | "all") {
    startTransition(async () => {
      if (task?.id) await deleteTask(task.id, scope);
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

        <Select
          label="Toewijzen aan"
          value={assigneeId}
          onChange={(e) => setAssigneeId(e.target.value)}
          options={[
            { value: "", label: "Niemand" },
            ...users.map((u) => ({ value: u.id, label: u.name })),
          ]}
        />

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
