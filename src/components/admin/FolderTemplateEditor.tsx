"use client";

import { useState, useMemo, useRef, useTransition, useEffect } from "react";
import {
  DndContext,
  DragEndEvent,
  DragMoveEvent,
  DragOverEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  ChevronRight,
  ChevronDown,
  Folder,
  FolderOpen,
  GripVertical,
  Plus,
  Trash2,
  Save,
  Check,
} from "lucide-react";
import type { TreeNode } from "@/actions/admin/folderTemplate";
import { saveFolderTemplate } from "@/actions/admin/folderTemplate";

// ─── ID generation ────────────────────────────────────────────────────────────

function genId() {
  return `n${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

// ─── Tree helpers ─────────────────────────────────────────────────────────────

interface FlatItem {
  id: string;
  name: string;
  depth: number;
  parentId: string | null;
  hasChildren: boolean;
}

function flattenTree(
  nodes: TreeNode[],
  parentId: string | null = null,
  depth = 0,
  collapsed: Set<string> = new Set()
): FlatItem[] {
  return nodes.flatMap((n) => {
    const item: FlatItem = {
      id: n.id,
      name: n.name,
      depth,
      parentId,
      hasChildren: n.children.length > 0,
    };
    const children =
      !collapsed.has(n.id) && n.children.length > 0
        ? flattenTree(n.children, n.id, depth + 1, collapsed)
        : [];
    return [item, ...children];
  });
}

function removeFromTree(
  nodes: TreeNode[],
  id: string
): { tree: TreeNode[]; removed: TreeNode | null } {
  let removed: TreeNode | null = null;
  const tree = nodes.flatMap((n) => {
    if (n.id === id) {
      removed = n;
      return [];
    }
    const r = removeFromTree(n.children, id);
    removed = removed ?? r.removed;
    return [{ ...n, children: r.tree }];
  });
  return { tree, removed };
}

function insertInTree(
  nodes: TreeNode[],
  newNode: TreeNode,
  parentId: string | null,
  index: number
): TreeNode[] {
  if (parentId === null) {
    const r = [...nodes];
    r.splice(index, 0, newNode);
    return r;
  }
  return nodes.map((n) => {
    if (n.id === parentId) {
      const children = [...n.children];
      children.splice(index, 0, newNode);
      return { ...n, children };
    }
    return { ...n, children: insertInTree(n.children, newNode, parentId, index) };
  });
}

function renameInTree(nodes: TreeNode[], id: string, name: string): TreeNode[] {
  return nodes.map((n) =>
    n.id === id
      ? { ...n, name }
      : { ...n, children: renameInTree(n.children, id, name) }
  );
}

function deleteFromTree(nodes: TreeNode[], id: string): TreeNode[] {
  return nodes.flatMap((n) =>
    n.id === id ? [] : [{ ...n, children: deleteFromTree(n.children, id) }]
  );
}

function addChildInTree(
  nodes: TreeNode[],
  parentId: string,
  child: TreeNode
): TreeNode[] {
  return nodes.map((n) =>
    n.id === parentId
      ? { ...n, children: [...n.children, child] }
      : { ...n, children: addChildInTree(n.children, parentId, child) }
  );
}

function getDescendantIds(nodes: TreeNode[], id: string): Set<string> {
  function collect(ns: TreeNode[]): TreeNode | null {
    for (const n of ns) {
      if (n.id === id) return n;
      const found = collect(n.children);
      if (found) return found;
    }
    return null;
  }
  const node = collect(nodes);
  if (!node) return new Set();
  const ids = new Set<string>();
  function gather(n: TreeNode) {
    n.children.forEach((c) => {
      ids.add(c.id);
      gather(c);
    });
  }
  gather(node);
  return ids;
}

// ─── Projection during drag ───────────────────────────────────────────────────

const INDENT = 24;

interface Projection {
  depth: number;
  parentId: string | null;
}

function getProjection(
  items: FlatItem[],
  activeId: string,
  overId: string,
  deltaX: number
): Projection {
  const overIndex = items.findIndex((i) => i.id === overId);
  const activeIndex = items.findIndex((i) => i.id === activeId);
  if (overIndex < 0 || activeIndex < 0) return { depth: 0, parentId: null };

  const movedItems = arrayMove(items, activeIndex, overIndex);
  const newIndex = movedItems.findIndex((i) => i.id === activeId);
  const prevItem = movedItems[newIndex - 1];
  const nextItem = movedItems[newIndex + 1];

  const rawDepth =
    items[activeIndex].depth + Math.round(deltaX / INDENT);
  const minDepth = nextItem ? nextItem.depth : 0;
  const maxDepth = prevItem ? prevItem.depth + 1 : 0;
  const depth = Math.max(minDepth, Math.min(maxDepth, rawDepth));

  // Find new parent: deepest ancestor above current position at depth-1
  let parentId: string | null = null;
  if (depth > 0) {
    const above = movedItems.slice(0, newIndex).reverse();
    const parent = above.find((i) => i.depth === depth - 1);
    parentId = parent?.id ?? null;
  }

  return { depth, parentId };
}

// ─── Sortable row ─────────────────────────────────────────────────────────────

function SortableRow({
  item,
  projection,
  isCollapsed,
  onToggleCollapse,
  onDelete,
  onStartAddChild,
  onRename,
}: {
  item: FlatItem;
  projection: Projection | null;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onDelete: () => void;
  onStartAddChild: () => void;
  onRename: (name: string) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const [editing, setEditing] = useState(false);
  const [editVal, setEditVal] = useState(item.name);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  const depth = isDragging && projection ? projection.depth : item.depth;

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    paddingLeft: `${depth * INDENT + 8}px`,
  };

  function commitEdit() {
    const trimmed = editVal.trim();
    if (trimmed && trimmed !== item.name) onRename(trimmed);
    else setEditVal(item.name);
    setEditing(false);
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-1.5 py-1 pr-2 rounded-lg group select-none ${
        isDragging ? "opacity-40" : "hover:bg-slate-100"
      }`}
    >
      {/* Grip */}
      <button
        {...listeners}
        {...attributes}
        className="cursor-grab active:cursor-grabbing text-slate-300 hover:text-slate-500 shrink-0 p-0.5 touch-none"
        tabIndex={-1}
      >
        <GripVertical size={14} />
      </button>

      {/* Collapse toggle */}
      {item.hasChildren ? (
        <button
          onClick={onToggleCollapse}
          className="text-slate-400 hover:text-slate-600 shrink-0"
        >
          {isCollapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
        </button>
      ) : (
        <span className="w-[14px] shrink-0" />
      )}

      {/* Folder icon */}
      {item.hasChildren && !isCollapsed ? (
        <FolderOpen size={14} className="text-teal-500 shrink-0" />
      ) : (
        <Folder size={14} className="text-slate-400 shrink-0" />
      )}

      {/* Name */}
      {editing ? (
        <input
          ref={inputRef}
          value={editVal}
          onChange={(e) => setEditVal(e.target.value)}
          onBlur={commitEdit}
          onKeyDown={(e) => {
            if (e.key === "Enter") commitEdit();
            if (e.key === "Escape") {
              setEditVal(item.name);
              setEditing(false);
            }
          }}
          className="flex-1 text-sm font-mono bg-white border border-teal-300 rounded px-2 py-0.5 focus:outline-none focus:ring-2 focus:ring-teal-400"
        />
      ) : (
        <span
          className="flex-1 text-sm font-mono text-slate-700 truncate cursor-text"
          onDoubleClick={() => {
            setEditVal(item.name);
            setEditing(true);
          }}
          title="Dubbelklik om te hernoemen"
        >
          {item.name}
        </span>
      )}

      {/* Actions (visible on hover) */}
      {!editing && (
        <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 shrink-0 transition-opacity">
          <button
            onClick={onStartAddChild}
            className="p-0.5 rounded text-slate-400 hover:text-teal-600 hover:bg-teal-50"
            title="Submap toevoegen"
          >
            <Plus size={13} />
          </button>
          <button
            onClick={onDelete}
            className="p-0.5 rounded text-slate-400 hover:text-red-500 hover:bg-red-50"
            title="Verwijderen (inclusief submappen)"
          >
            <Trash2 size={13} />
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Inline add-child row ──────────────────────────────────────────────────────

function AddChildRow({
  depth,
  onAdd,
  onCancel,
}: {
  depth: number;
  onAdd: (name: string) => void;
  onCancel: () => void;
}) {
  const [value, setValue] = useState("");
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => ref.current?.focus(), []);

  function commit() {
    const trimmed = value.trim();
    if (trimmed) onAdd(trimmed);
    else onCancel();
  }

  return (
    <div
      className="flex items-center gap-1.5 py-1 pr-2 rounded-lg bg-teal-50"
      style={{ paddingLeft: `${depth * INDENT + 8}px` }}
    >
      <span className="w-[18px] shrink-0" />
      <span className="w-[14px] shrink-0" />
      <Folder size={14} className="text-teal-400 shrink-0" />
      <input
        ref={ref}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
          if (e.key === "Escape") onCancel();
        }}
        onBlur={onCancel}
        placeholder="Naam van de submap..."
        className="flex-1 text-sm font-mono bg-white border border-teal-300 rounded px-2 py-0.5 focus:outline-none focus:ring-2 focus:ring-teal-400"
      />
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function FolderTemplateEditor({
  initialTree,
}: {
  initialTree: TreeNode[];
}) {
  const [tree, setTree] = useState<TreeNode[]>(initialTree);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [addingChildTo, setAddingChildTo] = useState<string | null>(null);

  // DnD state
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [deltaX, setDeltaX] = useState(0);

  // Save state
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // New root folder input
  const [newRootName, setNewRootName] = useState("");

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  // Flatten tree for rendering, exclude descendants of active item to avoid DnD issues
  const flatItems = useMemo(() => {
    if (!activeId) return flattenTree(tree, null, 0, collapsed);
    const descendants = getDescendantIds(tree, activeId);
    // Add active id itself to excluded set for "ghost" rendering, but keep it visible
    return flattenTree(tree, null, 0, collapsed).filter(
      (i) => !descendants.has(i.id)
    );
  }, [tree, collapsed, activeId]);

  const projection = useMemo(() => {
    if (!activeId || !overId || activeId === overId) return null;
    return getProjection(flatItems, activeId, overId, deltaX);
  }, [flatItems, activeId, overId, deltaX]);

  // ── DnD handlers ──

  function handleDragStart({ active }: DragStartEvent) {
    setActiveId(String(active.id));
    setOverId(String(active.id));
    setAddingChildTo(null);
  }

  function handleDragMove({ delta }: DragMoveEvent) {
    setDeltaX(delta.x);
  }

  function handleDragOver({ over }: DragOverEvent) {
    setOverId(over ? String(over.id) : null);
  }

  function handleDragEnd({ over }: DragEndEvent) {
    if (over && activeId) {
      const activeFlat = flatItems.find((i) => i.id === activeId);
      const proj = projection ?? {
        depth: activeFlat?.depth ?? 0,
        parentId: activeFlat?.parentId ?? null,
      };

      const overIdStr = String(over.id);
      const activeIndex = flatItems.findIndex((i) => i.id === activeId);
      const overIndex = flatItems.findIndex((i) => i.id === overIdStr);

      if (
        activeIndex !== overIndex ||
        proj.parentId !== activeFlat?.parentId
      ) {
        const newFlat = arrayMove(flatItems, activeIndex, overIndex);
        const newActiveIndex = newFlat.findIndex((i) => i.id === activeId);
        const siblingsBefore = newFlat
          .slice(0, newActiveIndex)
          .filter((i) => i.parentId === proj.parentId && i.id !== activeId);
        const insertIndex = siblingsBefore.length;

        setTree((prev) => {
          const { tree: without, removed } = removeFromTree(prev, activeId);
          if (!removed) return prev;
          return insertInTree(without, removed, proj.parentId, insertIndex);
        });
        setSaved(false);
      }
    }
    setActiveId(null);
    setOverId(null);
    setDeltaX(0);
  }

  function handleDragCancel() {
    setActiveId(null);
    setOverId(null);
    setDeltaX(0);
  }

  // ── Tree mutations ──

  function addRoot() {
    const name = newRootName.trim();
    if (!name) return;
    setTree((prev) => [...prev, { id: genId(), name, children: [] }]);
    setNewRootName("");
    setSaved(false);
  }

  function confirmAddChild(parentId: string, name: string) {
    setTree((prev) =>
      addChildInTree(prev, parentId, { id: genId(), name, children: [] })
    );
    setCollapsed((prev) => {
      const n = new Set(prev);
      n.delete(parentId);
      return n;
    });
    setAddingChildTo(null);
    setSaved(false);
  }

  function handleDelete(id: string) {
    setTree((prev) => deleteFromTree(prev, id));
    setSaved(false);
  }

  function handleRename(id: string, name: string) {
    setTree((prev) => renameInTree(prev, id, name));
    setSaved(false);
  }

  function toggleCollapse(id: string) {
    setCollapsed((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  function handleSave() {
    setSaveError(null);
    setSaved(false);
    startTransition(async () => {
      const result = await saveFolderTemplate(tree);
      if ("error" in result) setSaveError(result.error);
      else setSaved(true);
    });
  }

  // Build the list with optional "add child" row inserted after its parent
  interface RowEntry {
    type: "item";
    item: FlatItem;
  }
  interface AddEntry {
    type: "add";
    parentId: string;
    depth: number;
  }
  type Entry = RowEntry | AddEntry;

  const rows = useMemo<Entry[]>(() => {
    const result: Entry[] = [];
    for (const item of flatItems) {
      result.push({ type: "item", item });
      if (addingChildTo === item.id) {
        result.push({ type: "add", parentId: item.id, depth: item.depth + 1 });
      }
    }
    return result;
  }, [flatItems, addingChildTo]);

  const activeItem = flatItems.find((i) => i.id === activeId);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-700">Mappenstructuur</h2>
        <p className="text-xs text-slate-400">
          Sleep om te verplaatsen · Dubbelklik om te hernoemen
        </p>
      </div>

      {/* Tree */}
      <div className="border border-slate-200 rounded-xl bg-slate-50 p-2 min-h-12">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragMove={handleDragMove}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
          onDragCancel={handleDragCancel}
        >
          <SortableContext
            items={flatItems.map((i) => i.id)}
            strategy={verticalListSortingStrategy}
          >
            {rows.map((entry) =>
              entry.type === "item" ? (
                <SortableRow
                  key={entry.item.id}
                  item={entry.item}
                  projection={entry.item.id === activeId ? projection : null}
                  isCollapsed={collapsed.has(entry.item.id)}
                  onToggleCollapse={() => toggleCollapse(entry.item.id)}
                  onDelete={() => handleDelete(entry.item.id)}
                  onStartAddChild={() => setAddingChildTo(entry.item.id)}
                  onRename={(name) => handleRename(entry.item.id, name)}
                />
              ) : (
                <AddChildRow
                  key={`add-${entry.parentId}`}
                  depth={entry.depth}
                  onAdd={(name) => confirmAddChild(entry.parentId, name)}
                  onCancel={() => setAddingChildTo(null)}
                />
              )
            )}
          </SortableContext>

          <DragOverlay dropAnimation={null}>
            {activeItem && (
              <div
                className="flex items-center gap-1.5 py-1 px-2 bg-white rounded-lg shadow-xl border border-teal-300 opacity-95"
                style={{
                  paddingLeft: `${(projection?.depth ?? activeItem.depth) * INDENT + 8}px`,
                }}
              >
                <GripVertical size={14} className="text-slate-400 shrink-0" />
                <span className="w-[14px] shrink-0" />
                <Folder size={14} className="text-teal-500 shrink-0" />
                <span className="text-sm font-mono text-slate-700">
                  {activeItem.name}
                </span>
              </div>
            )}
          </DragOverlay>
        </DndContext>

        {flatItems.length === 0 && (
          <p className="text-sm text-slate-400 text-center py-6">
            Nog geen mappen. Voeg een map toe hieronder.
          </p>
        )}
      </div>

      {/* Add root folder */}
      <div>
        <p className="text-xs font-medium text-slate-500 mb-2">Nieuwe map toevoegen (root)</p>
        <div className="flex gap-2">
          <input
            value={newRootName}
            onChange={(e) => setNewRootName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addRoot();
              }
            }}
            placeholder="bijv. Marketing  of  {jaar}"
            className="flex-1 text-sm font-mono border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
          />
          <button
            onClick={addRoot}
            disabled={!newRootName.trim()}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-600 text-white text-sm rounded-lg hover:bg-teal-700 disabled:opacity-40 shrink-0"
          >
            <Plus size={14} />
            Toevoegen
          </button>
        </div>
      </div>

      {/* Year placeholder hint */}
      <div className="p-3 bg-teal-50 rounded-xl border border-teal-100 text-xs text-teal-700 leading-relaxed">
        Gebruik{" "}
        <code className="bg-teal-100 px-1 rounded">{"{jaar}"}</code> voor het
        huidige jaar en{" "}
        <code className="bg-teal-100 px-1 rounded">{"{vorigjaar}"}</code> voor
        het vorige jaar. Mappen met{" "}
        <code className="bg-teal-100 px-1 rounded">{"{jaar}"}</code> worden
        elk jaar automatisch aangemaakt voor bestaande klanten.
      </div>

      {/* Save */}
      {saveError && (
        <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-lg">
          {saveError}
        </p>
      )}
      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={isPending}
          className="flex items-center gap-1.5 px-4 py-2 bg-teal-600 text-white text-sm rounded-lg hover:bg-teal-700 disabled:opacity-60"
        >
          <Save size={14} />
          {isPending ? "Opslaan..." : "Opslaan"}
        </button>
        {saved && (
          <span className="flex items-center gap-1.5 text-sm text-teal-600">
            <Check size={14} />
            Opgeslagen
          </span>
        )}
      </div>
    </div>
  );
}
