"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import {
  createTaskSchema,
  updateTaskSchema,
  moveTaskSchema,
} from "@/lib/validations/task";
import { shiftDate, defaultEndDate } from "@/lib/recurrence";

export async function getTasks() {
  await requireAuth();
  return db.task.findMany({
    include: {
      creator: { select: { id: true, name: true } },
      assignees: { include: { user: { select: { id: true, name: true } } } },
      tags: true,
    },
    orderBy: [{ status: "asc" }, { position: "asc" }],
  });
}

export async function createTask(data: unknown) {
  const session = await requireAuth();
  const parsed = createTaskSchema.safeParse(data);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const { tags, dueAt, recurrenceRule, recurrenceEndAt, assigneeIds, ...taskData } = parsed.data;

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
      recurrenceRule: recurrenceRule ?? null,
      recurrenceEndAt: recurrenceEndAt ? new Date(recurrenceEndAt) : null,
      tags: { create: tags },
      assignees: { create: assigneeIds.map((uid) => ({ userId: uid })) },
    },
    include: {
      creator: { select: { id: true, name: true, color: true } },
      assignees: { include: { user: { select: { id: true, name: true, color: true } } } },
      client: { select: { id: true, name: true, slug: true } },
      tags: true,
    },
  });

  // Generate recurring instances when there is a rule and a due date to iterate from
  if (recurrenceRule && dueAt) {
    const endDate = recurrenceEndAt
      ? new Date(recurrenceEndAt)
      : defaultEndDate(new Date(dueAt), recurrenceRule);

    let current = shiftDate(new Date(dueAt), recurrenceRule);
    let position = task.position + 1000;

    while (current <= endDate) {
      await db.task.create({
        data: {
          ...taskData,
          dueAt: current,
          position,
          creatorId: session.userId,
          recurrenceRule,
          parentId: task.id,
          tags: { create: tags.map((t) => ({ name: t.name, color: t.color })) },
          assignees: { create: assigneeIds.map((uid) => ({ userId: uid })) },
        },
      });
      current = shiftDate(current, recurrenceRule);
      position += 1000;
    }
  }

  revalidatePath("/taken");
  return { success: true, task };
}

export async function updateTask(data: unknown) {
  await requireAuth();
  const parsed = updateTaskSchema.safeParse(data);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const { id, tags, dueAt, assigneeIds, ...taskData } = parsed.data;

  const updateData: Record<string, unknown> = { ...taskData };
  if (dueAt !== undefined) updateData.dueAt = dueAt ? new Date(dueAt) : null;

  if (tags !== undefined) {
    await db.taskTag.deleteMany({ where: { taskId: id } });
    updateData.tags = { create: tags };
  }

  if (assigneeIds !== undefined) {
    await db.taskAssignee.deleteMany({ where: { taskId: id } });
    updateData.assignees = { create: assigneeIds.map((uid) => ({ userId: uid })) };
  }

  const task = await db.task.update({
    where: { id },
    data: updateData,
    include: {
      creator: { select: { id: true, name: true } },
      assignees: { include: { user: { select: { id: true, name: true } } } },
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

export async function deleteTask(id: string, scope: "one" | "all" = "one") {
  await requireAuth();

  if (scope === "all") {
    const task = await db.task.findUnique({ where: { id }, select: { parentId: true } });
    const rootId = task?.parentId ?? id;
    await db.task.deleteMany({
      where: { OR: [{ id: rootId }, { parentId: rootId }] },
    });
  } else {
    await db.task.delete({ where: { id } });
  }

  revalidatePath("/taken");
  return { success: true };
}
