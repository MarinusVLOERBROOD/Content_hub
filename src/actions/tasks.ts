"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import {
  createTaskSchema,
  updateTaskSchema,
  moveTaskSchema,
} from "@/lib/validations/task";

export async function getTasks() {
  await requireAuth();
  return db.task.findMany({
    include: {
      creator: { select: { id: true, name: true } },
      assignee: { select: { id: true, name: true } },
      tags: true,
    },
    orderBy: [{ status: "asc" }, { position: "asc" }],
  });
}

export async function createTask(data: unknown) {
  const session = await requireAuth();
  const parsed = createTaskSchema.safeParse(data);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const { tags, dueAt, ...taskData } = parsed.data;

  // Get max position in the column
  const maxPos = await db.task.findFirst({
    where: { status: taskData.status },
    orderBy: { position: "desc" },
    select: { position: true },
  });

  const task = await db.task.create({
    data: {
      ...taskData,
      dueAt: dueAt ? new Date(dueAt) : null,
      position: (maxPos?.position ?? 0) + 1000,
      creatorId: session.userId,
      tags: { create: tags },
    },
    include: {
      creator: { select: { id: true, name: true, color: true } },
      assignee: { select: { id: true, name: true, color: true } },
      client: { select: { id: true, name: true, slug: true } },
      tags: true,
    },
  });

  revalidatePath("/taken");
  return { success: true, task };
}

export async function updateTask(data: unknown) {
  await requireAuth();
  const parsed = updateTaskSchema.safeParse(data);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const { id, tags, dueAt, ...taskData } = parsed.data;

  const updateData: Record<string, unknown> = { ...taskData };
  if (dueAt !== undefined) updateData.dueAt = dueAt ? new Date(dueAt) : null;

  if (tags !== undefined) {
    await db.taskTag.deleteMany({ where: { taskId: id } });
    updateData.tags = { create: tags };
  }

  const task = await db.task.update({
    where: { id },
    data: updateData,
    include: {
      creator: { select: { id: true, name: true } },
      assignee: { select: { id: true, name: true } },
      tags: true,
    },
  });

  revalidatePath("/taken");
  return { success: true, task };
}

export async function moveTask(data: unknown) {
  await requireAuth();
  const parsed = moveTaskSchema.safeParse(data);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const task = await db.task.update({
    where: { id: parsed.data.id },
    data: { status: parsed.data.status, position: parsed.data.position },
  });

  revalidatePath("/taken");
  return { success: true, task };
}

export async function deleteTask(id: string) {
  await requireAuth();
  await db.task.delete({ where: { id } });
  revalidatePath("/taken");
  return { success: true };
}
