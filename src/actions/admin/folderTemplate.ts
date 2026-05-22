"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { DEFAULT_FOLDER_TEMPLATE } from "@/lib/client-folders";

export interface TreeNode {
  id: string;
  name: string;
  children: TreeNode[];
}

// Convert tree to leaf paths (used for display / migration)
function treeToLeafPaths(nodes: TreeNode[], prefix = ""): string[] {
  return nodes.flatMap((n) => {
    const path = prefix ? `${prefix}/${n.name}` : n.name;
    return n.children.length === 0 ? [path] : treeToLeafPaths(n.children, path);
  });
}

// Convert flat path strings to a tree (for migrating old format)
function pathsToTree(paths: string[]): TreeNode[] {
  let uid = 0;
  function genId() {
    return `m${++uid}`;
  }

  const root: TreeNode[] = [];
  for (const path of paths) {
    const parts = path.split("/").filter(Boolean);
    let current = root;
    for (const part of parts) {
      let node = current.find((n) => n.name === part);
      if (!node) {
        node = { id: genId(), name: part, children: [] };
        current.push(node);
      }
      current = node.children;
    }
  }
  return root;
}

export async function getFolderTemplate(): Promise<TreeNode[]> {
  await requireAdmin();
  try {
    const setting = await db.appSetting.findUnique({
      where: { key: "folder_template" },
    });
    if (setting) {
      const parsed = JSON.parse(setting.value);
      if (Array.isArray(parsed)) {
        // Detect format: tree (array of objects) vs old flat strings
        if (parsed.length === 0) return pathsToTree(DEFAULT_FOLDER_TEMPLATE);
        if (typeof parsed[0] === "object") return parsed as TreeNode[];
        if (typeof parsed[0] === "string") return pathsToTree(parsed as string[]);
      }
    }
  } catch {
    // fall through
  }
  return pathsToTree(DEFAULT_FOLDER_TEMPLATE);
}

export async function saveFolderTemplate(
  tree: TreeNode[]
): Promise<{ success: true } | { error: string }> {
  await requireAdmin();

  if (!Array.isArray(tree)) return { error: "Ongeldige mappenstructuur" };

  const paths = treeToLeafPaths(tree);
  if (paths.length === 0) return { error: "Er moet minimaal één map zijn" };

  try {
    await db.appSetting.upsert({
      where: { key: "folder_template" },
      update: { value: JSON.stringify(tree) },
      create: { key: "folder_template", value: JSON.stringify(tree) },
    });
    revalidatePath("/admin/mappen");
    return { success: true };
  } catch {
    return { error: "Opslaan mislukt" };
  }
}
