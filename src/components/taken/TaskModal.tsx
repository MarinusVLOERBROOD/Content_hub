"use client";

import { useState, useTransition } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { createTask, updateTask, deleteTask } from "@/actions/tasks";
import { Trash2 } from "lucide-react";

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
  const [title, setTitle] = useState(task?.title ?? "");
  const [description, setDescription] = useState(task?.description ?? "");
  const [status, setStatus] = useState(task?.status ?? defaultStatus);
  const [priority, setPriority] = useState(task?.priority ?? "medium");
  const [dueAt, setDueAt] = useState(
    task?.dueAt ? new Date(task.dueAt).toISOString().slice(0, 10) : ""
  );
  const [clientId, setClientId] = useState(task?.clientId ?? "");
  const [assigneeId, setAssigneeId] = useState(task?.assigneeId ?? "");
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

  function handleDelete() {
    startTransition(async () => {
      if (task?.id) await deleteTask(task.id);
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

        {error && <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

        <div className="flex items-center justify-between pt-2">
          {isEdit && (
            <button
              type="button"
              onClick={() => (deleteConfirm ? handleDelete() : setDeleteConfirm(true))}
              className="flex items-center gap-1.5 text-sm text-red-500 hover:text-red-700"
              disabled={isPending}
            >
              <Trash2 size={14} />
              {deleteConfirm ? "Zeker?" : "Verwijderen"}
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
