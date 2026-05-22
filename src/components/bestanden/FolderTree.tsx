"use client";

import { useState } from "react";
import { Folder, FolderOpen, ChevronRight, ChevronDown } from "lucide-react";
import type { FolderNode } from "@/lib/client-folders";

interface FolderTreeProps {
  nodes: FolderNode[];
  selectedPath: string;
  onSelect: (path: string) => void;
  depth?: number;
}

function FolderItem({
  node,
  selectedPath,
  onSelect,
  depth,
}: {
  node: FolderNode;
  selectedPath: string;
  onSelect: (path: string) => void;
  depth: number;
}) {
  const [expanded, setExpanded] = useState(
    selectedPath.startsWith(node.path) || depth < 2
  );
  const hasChildren = node.children.length > 0;
  const isSelected = selectedPath === node.path;

  return (
    <div>
      <button
        onClick={() => {
          onSelect(node.path);
          if (hasChildren) setExpanded(!expanded);
        }}
        className={`flex items-center gap-1.5 w-full px-2 py-1.5 rounded-lg text-left transition-colors text-sm ${
          isSelected
            ? "bg-teal-50 text-teal-700 font-medium"
            : "text-slate-600 hover:bg-slate-50"
        }`}
        style={{ paddingLeft: `${(depth + 1) * 12}px` }}
      >
        {hasChildren ? (
          <span className="w-3.5 shrink-0">
            {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
          </span>
        ) : (
          <span className="w-3.5 shrink-0" />
        )}
        {isSelected || expanded ? (
          <FolderOpen size={14} className="shrink-0 text-teal-500" />
        ) : (
          <Folder size={14} className="shrink-0 text-slate-400" />
        )}
        <span className="truncate">{node.name}</span>
      </button>

      {hasChildren && expanded && (
        <FolderTree
          nodes={node.children}
          selectedPath={selectedPath}
          onSelect={onSelect}
          depth={depth + 1}
        />
      )}
    </div>
  );
}

export function FolderTree({ nodes, selectedPath, onSelect, depth = 0 }: FolderTreeProps) {
  return (
    <div>
      {nodes.map((node) => (
        <FolderItem
          key={node.path}
          node={node}
          selectedPath={selectedPath}
          onSelect={onSelect}
          depth={depth}
        />
      ))}
    </div>
  );
}
