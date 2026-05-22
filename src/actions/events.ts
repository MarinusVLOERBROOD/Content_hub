"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { createEventSchema, updateEventSchema } from "@/lib/validations/event";

function shiftDate(date: Date, rule: string): Date {
  const d = new Date(date);
  if (rule === "daily") d.setDate(d.getDate() + 1);
  else if (rule === "weekly") d.setDate(d.getDate() + 7);
  else if (rule === "monthly") d.setMonth(d.getMonth() + 1);
  return d;
}

function defaultEndDate(from: Date, rule: string): Date {
  const d = new Date(from);
  if (rule === "daily") d.setDate(d.getDate() + 30);
  else if (rule === "weekly") d.setDate(d.getDate() + 84);
  else d.setMonth(d.getMonth() + 12);
  return d;
}

export async function createEvent(data: unknown) {
  const session = await requireAuth();
  const parsed = createEventSchema.safeParse(data);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const { attendeeIds, tags, recurrenceRule, recurrenceEndAt, ...eventData } = parsed.data;

  const attendeeCreate = [
    { userId: session.userId },
    ...attendeeIds
      .filter((id) => id !== session.userId)
      .map((userId) => ({ userId })),
  ];

  const event = await db.event.create({
    data: {
      ...eventData,
      startAt: new Date(eventData.startAt),
      endAt: new Date(eventData.endAt),
      creatorId: session.userId,
      recurrenceRule: recurrenceRule ?? null,
      recurrenceEndAt: recurrenceEndAt ? new Date(recurrenceEndAt) : null,
      attendees: { create: attendeeCreate },
      tags: { create: tags },
    },
  });

  // Generate recurring instances
  if (recurrenceRule) {
    const startDate = new Date(eventData.startAt);
    const endDate = recurrenceEndAt
      ? new Date(recurrenceEndAt)
      : defaultEndDate(startDate, recurrenceRule);
    const duration = new Date(eventData.endAt).getTime() - startDate.getTime();

    let currentStart = shiftDate(startDate, recurrenceRule);

    while (currentStart <= endDate) {
      const currentEnd = new Date(currentStart.getTime() + duration);
      await db.event.create({
        data: {
          ...eventData,
          startAt: currentStart,
          endAt: currentEnd,
          creatorId: session.userId,
          recurrenceRule,
          parentId: event.id,
          attendees: {
            create: attendeeCreate.map((a) => ({ userId: a.userId })),
          },
          tags: { create: tags.map((t) => ({ name: t.name, color: t.color })) },
        },
      });
      currentStart = shiftDate(currentStart, recurrenceRule);
    }
  }

  revalidatePath("/agenda");
  return { success: true, event };
}

export async function updateEvent(data: unknown) {
  const session = await requireAuth();
  const parsed = updateEventSchema.safeParse(data);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const { id, attendeeIds, tags, recurrenceRule: _r, recurrenceEndAt: _re, ...eventData } = parsed.data;

  const existing = await db.event.findUnique({ where: { id } });
  if (!existing || existing.creatorId !== session.userId) {
    return { error: "Niet bevoegd om dit evenement te bewerken" };
  }

  const updateData: Record<string, unknown> = {};
  if (eventData.title !== undefined) updateData.title = eventData.title;
  if (eventData.description !== undefined) updateData.description = eventData.description;
  if (eventData.startAt !== undefined) updateData.startAt = new Date(eventData.startAt);
  if (eventData.endAt !== undefined) updateData.endAt = new Date(eventData.endAt);
  if (eventData.allDay !== undefined) updateData.allDay = eventData.allDay;
  if (eventData.color !== undefined) updateData.color = eventData.color;
  if (eventData.clientId !== undefined) updateData.clientId = eventData.clientId ?? null;

  if (attendeeIds !== undefined) {
    await db.eventAttendee.deleteMany({ where: { eventId: id } });
    updateData.attendees = {
      create: [
        { userId: session.userId },
        ...attendeeIds
          .filter((uid) => uid !== session.userId)
          .map((userId) => ({ userId })),
      ],
    };
  }

  if (tags !== undefined) {
    await db.eventTag.deleteMany({ where: { eventId: id } });
    updateData.tags = { create: tags };
  }

  const event = await db.event.update({ where: { id }, data: updateData });
  revalidatePath("/agenda");
  return { success: true, event };
}

export async function deleteEvent(id: string, scope: "one" | "all" = "one") {
  const session = await requireAuth();
  const event = await db.event.findUnique({ where: { id } });
  if (!event || event.creatorId !== session.userId) {
    return { error: "Niet bevoegd" };
  }

  if (scope === "all") {
    const rootId = event.parentId ?? id;
    await db.event.deleteMany({
      where: { OR: [{ id: rootId }, { parentId: rootId }] },
    });
  } else {
    await db.event.delete({ where: { id } });
  }

  revalidatePath("/agenda");
  return { success: true };
}

export async function getEventsForUser(userId: string) {
  return db.event.findMany({
    where: {
      OR: [
        { creatorId: userId },
        { attendees: { some: { userId } } },
      ],
    },
    include: {
      creator: { select: { id: true, name: true } },
      attendees: { include: { user: { select: { id: true, name: true } } } },
      tags: true,
    },
    orderBy: { startAt: "asc" },
  });
}
