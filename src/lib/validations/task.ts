import { z } from "zod";

export const createTaskSchema = z.object({
  title: z.string().min(1, "Titel is verplicht"),
  description: z.string().optional(),
  status: z.enum(["todo", "doing", "done", "review"]).default("todo"),
  priority: z.enum(["low", "medium", "high"]).default("medium"),
  dueAt: z.string().datetime().optional().nullable(),
  clientId: z.string().optional().nullable(),
  assigneeId: z.string().optional().nullable(),
  tags: z.array(z.object({ name: z.string(), color: z.string() })).default([]),
});

export const updateTaskSchema = createTaskSchema.partial().extend({
  id: z.string(),
});

export const moveTaskSchema = z.object({
  id: z.string(),
  status: z.enum(["todo", "doing", "done", "review"]),
  position: z.number(),
});
