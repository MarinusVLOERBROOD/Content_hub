import { z } from "zod";

export const createEventSchema = z.object({
  title: z.string().min(1, "Titel is verplicht"),
  description: z.string().optional(),
  startAt: z.string().datetime(),
  endAt: z.string().datetime(),
  allDay: z.boolean().default(false),
  color: z.string().default("teal"),
  attendeeIds: z.array(z.string()).default([]),
  clientId: z.string().optional().nullable(),
  tags: z.array(z.object({ name: z.string(), color: z.string() })).default([]),
  recurrenceRule: z.enum(["daily", "weekly", "monthly"]).optional().nullable(),
  recurrenceEndAt: z.string().datetime().optional().nullable(),
});

export const updateEventSchema = createEventSchema.partial().extend({
  id: z.string(),
});
