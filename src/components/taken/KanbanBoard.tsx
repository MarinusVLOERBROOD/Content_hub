"use client";

import { useState, useTransition } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  closestCorners,
  useDroppable,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Plus, GripVertical, Calendar, Pencil } from "lucide-react";
import { moveTask } from "@/actions/tasks";
import { TaskModal } from "./TaskModal";
import { format, isPast } from "date-fns";
import { nl } from "date-fns/locale";
import { Badge } from "@/components/ui/Badge";

interface Tag { id: string; name: string; color: string; }
interface UserItem { id: string; name: string; color: string; }
interface ClientItem { id: string; name: string; slug: string; }
interface Task {
  id: string;
  title: string;
  description?: string | null;
  status: string;
  priority: string;
  dueAt?: Date | null;
  position: number;
  assigneeId?: string | null;
  assignee?: UserItem | null;
  creator: UserItem;
  client?: ClientItem | null;
  clientId?: string | null;
  tags: Tag[];
}

interface KanbanBoardProps {
  initialTasks: Task[];
  users: UserItem[];
  clients: ClientItem[];
  currentUserId: string;
}

const COLUMNS = [
  { id: "todo", label: "Te doen", color: "bg-slate-400" },
  { id: "doing", label: "Bezig", color: "bg-blue-500" },
  { id: "review", label: "Review", color: "bg-yellow-500" },
  { id: "done", label: "Klaar", color: "bg-green-500" },
];

const priorityColors: Record<string, string> = {
  high: "red",
  medium: "yellow",
  low: "green",
};

const priorityLabels: Record<string, string> = {
  high: "Hoog",
  medium: "Middel",
  low: "Laag",
};

const userColorClass: Record<string, string> = {
  teal: "bg-teal-500",
  blue: "bg-blue-500",
  purple: "bg-purple-500",
  red: "bg-red-500",
  orange: "bg-orange-500",
  green: "bg-green-500",
};

function DroppableColumn({ id, children }: { id: string; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div
      ref={setNodeRef}
      className={`flex-1 space-y-2 min-h-16 rounded-xl p-2 transition-colors ${
        isOver ? "bg-teal-50 ring-2 ring-teal-200" : "bg-slate-50"
      }`}
    >
      {children}
    </div>
  );
}

function TaskCard({
  task,
  onEdit,
  isDragging = false,
}: {
  task: Task;
  onEdit: (t: Task) => void;
  isDragging?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging: isSortDragging } = useSortable({
    id: task.id,
    data: { task, sortable: { containerId: task.status } },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isSortDragging ? 0.4 : 1,
  };

  const isDue = task.dueAt && isPast(new Date(task.dueAt)) && task.status !== "done";

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`bg-white rounded-xl border border-slate-100 p-3 shadow-sm ${isDragging ? "shadow-lg rotate-1" : ""}`}
    >
      <div className="flex items-start gap-2">
        <button
          {...listeners}
          {...attributes}
          suppressHydrationWarning
          className="mt-0.5 text-slate-300 hover:text-slate-500 cursor-grab active:cursor-grabbing shrink-0"
        >
          <GripVertical size={14} />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-slate-800 leading-snug">{task.title}</p>
          {task.client && (
            <p className="text-xs text-teal-600 mt-0.5 font-medium">{task.client.name}</p>
          )}

          <div className="flex flex-wrap gap-1 mt-2">
            <Badge label={priorityLabels[task.priority]} color={priorityColors[task.priority]} />
            {task.tags.map((tag) => (
              <Badge key={tag.id} label={tag.name} color={tag.color} />
            ))}
          </div>

          <div className="flex items-center gap-3 mt-2">
            {task.dueAt && (
              <span className={`flex items-center gap-1 text-xs ${isDue ? "text-red-500" : "text-slate-400"}`}>
                <Calendar size={11} />
                {format(new Date(task.dueAt), "d MMM", { locale: nl })}
              </span>
            )}
            {task.assignee && (
              <span className="flex items-center gap-1.5 text-xs text-slate-500">
                <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${userColorClass[task.assignee.color] ?? "bg-teal-500"}`} />
                {task.assignee.name.split(" ")[0]}
              </span>
            )}
          </div>
        </div>
        <button
          onClick={() => onEdit(task)}
          className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600 shrink-0"
        >
          <Pencil size={12} />
        </button>
      </div>
    </div>
  );
}

export function KanbanBoard({ initialTasks, users, clients, currentUserId }: KanbanBoardProps) {
  const [tasks, setTasks] = useState(initialTasks);
  const [editTask, setEditTask] = useState<Task | null>(null);
  const [createStatus, setCreateStatus] = useState<string | null>(null);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [filterAssignee, setFilterAssignee] = useState(currentUserId);
  const [filterClient, setFilterClient] = useState("");
  const [, startTransition] = useTransition();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const filteredTasks = tasks.filter((t) => {
    if (filterAssignee && t.assigneeId !== filterAssignee) return false;
    if (filterClient && t.clientId !== filterClient) return false;
    return true;
  });

  const priorityOrder: Record<string, number> = { high: 0, medium: 1, low: 2 };

  function getColumnTasks(status: string) {
    return filteredTasks
      .filter((t) => t.status === status)
      .sort((a, b) => {
        // High-priority tasks float to top; within same priority sort by position
        const pDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
        if (pDiff !== 0) return pDiff;
        return a.position - b.position;
      });
  }

  function handleDragStart(event: DragStartEvent) {
    const task = tasks.find((t) => t.id === event.active.id);
    setActiveTask(task ?? null);
  }

  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event;
    if (!over) return;

    const draggedTask = tasks.find((t) => t.id === active.id);
    if (!draggedTask) return;

    const overColumn = COLUMNS.find((c) => c.id === over.id);
    const overTask = tasks.find((t) => t.id === over.id);
    const targetStatus =
      overColumn?.id ??
      overTask?.status ??
      (over.data?.current as any)?.sortable?.containerId;

    if (targetStatus && draggedTask.status !== targetStatus) {
      setTasks((prev) =>
        prev.map((t) => (t.id === draggedTask.id ? { ...t, status: targetStatus } : t))
      );
    }
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveTask(null);

    if (!over) return;

    const draggedTask = tasks.find((t) => t.id === active.id);
    if (!draggedTask) return;

    const overColumn = COLUMNS.find((c) => c.id === over.id);
    const overTask = tasks.find((t) => t.id === over.id);
    const targetStatus =
      overColumn?.id ??
      overTask?.status ??
      (over.data?.current as any)?.sortable?.containerId ??
      draggedTask.status;

    const columnTasks = tasks
      .filter((t) => t.status === targetStatus && t.id !== draggedTask.id)
      .sort((a, b) => a.position - b.position);

    let newPosition: number;
    if (overTask && overTask.id !== draggedTask.id) {
      const overIdx = columnTasks.findIndex((t) => t.id === overTask.id);
      const prev = columnTasks[overIdx - 1]?.position ?? 0;
      const next = columnTasks[overIdx]?.position ?? (prev + 2000);
      newPosition = (prev + next) / 2;
    } else {
      newPosition = (columnTasks[columnTasks.length - 1]?.position ?? 0) + 1000;
    }

    setTasks((prev) =>
      prev.map((t) =>
        t.id === draggedTask.id ? { ...t, status: targetStatus, position: newPosition } : t
      )
    );

    startTransition(async () => {
      await moveTask({ id: draggedTask.id, status: targetStatus as any, position: newPosition });
    });
  }

  return (
    <>
      {/* Filters */}
      <div className="bg-white border-b border-slate-100 px-6 py-3 flex items-center gap-4">
        <select
          value={filterAssignee}
          onChange={(e) => setFilterAssignee(e.target.value)}
          className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-teal-500"
        >
          <option value="">Alle medewerkers</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>{u.name}</option>
          ))}
        </select>
        <select
          value={filterClient}
          onChange={(e) => setFilterClient(e.target.value)}
          className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-teal-500"
        >
          <option value="">Alle klanten</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-4 p-6 overflow-x-auto h-full">
          {COLUMNS.map((col) => {
            const colTasks = getColumnTasks(col.id);
            return (
              <div key={col.id} className="w-72 shrink-0 flex flex-col">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className={`w-2.5 h-2.5 rounded-full ${col.color}`} />
                    <span className="text-sm font-semibold text-slate-700">{col.label}</span>
                    <span className="text-xs text-slate-400 bg-slate-100 rounded-full px-1.5 py-0.5">
                      {colTasks.length}
                    </span>
                  </div>
                  <button
                    onClick={() => setCreateStatus(col.id)}
                    className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600"
                  >
                    <Plus size={14} />
                  </button>
                </div>

                <SortableContext
                  id={col.id}
                  items={colTasks.map((t) => t.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <DroppableColumn id={col.id}>
                    {colTasks.map((task) => (
                      <TaskCard key={task.id} task={task} onEdit={setEditTask} />
                    ))}
                    {colTasks.length === 0 && (
                      <div className="text-center py-6 text-slate-300 text-xs">
                        Sleep hier naartoe
                      </div>
                    )}
                  </DroppableColumn>
                </SortableContext>
              </div>
            );
          })}
        </div>

        <DragOverlay>
          {activeTask && (
            <TaskCard task={activeTask} onEdit={() => {}} isDragging />
          )}
        </DragOverlay>
      </DndContext>

      {editTask && (
        <TaskModal
          key={editTask.id}
          open={true}
          onClose={() => setEditTask(null)}
          task={editTask}
          users={users}
          clients={clients}
        />
      )}

      {createStatus && (
        <TaskModal
          key={`create-${createStatus}`}
          open={true}
          onClose={() => setCreateStatus(null)}
          onCreated={(newTask) => setTasks((prev) => [...prev, newTask])}
          defaultStatus={createStatus}
          users={users}
          clients={clients}
        />
      )}
    </>
  );
}
