"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { createEventSchema, updateEventSchema } from "@/lib/validations/event";

export async function createEvent(data: unknown) {
  const session = await requireAuth();
  const parsed = createEventSchema.safeParse(data);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const { attendeeIds, tags, ...eventData } = parsed.data;

  const event = await db.event.create({
    data: {
      ...eventData,
      startAt: new Date(eventData.startAt),
      endAt: new Date(eventData.endAt),
      creatorId: session.userId,
      attendees: {
        create: [
          { userId: session.userId },
          ...attendeeIds
            .filter((id) => id !== session.userId)
            .map((userId) => ({ userId })),
        ],
      },
      tags: { create: tags },
    },
  });

  revalidatePath("/agenda");
  return { success: true, event };
}

export async function updateEvent(data: unknown) {
  const session = await requireAuth();
  const parsed = updateEventSchema.safeParse(data);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const { id, attendeeIds, tags, ...eventData } = parsed.data;

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

export async function deleteEvent(id: string) {
  const session = await requireAuth();
  const event = await db.event.findUnique({ where: { id } });
  if (!event || event.creatorId !== session.userId) {
    return { error: "Niet bevoegd" };
  }
  await db.event.delete({ where: { id } });
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
