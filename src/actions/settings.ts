"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { getSession } from "@/lib/session";
import { z } from "zod";

const updateProfileSchema = z.object({
  name: z.string().min(1, "Naam is verplicht"),
  jobTitle: z.string().optional(),
  // Allow preset names OR any hex color (#rrggbb / #rgb)
  color: z.string().regex(/^(teal|blue|purple|red|orange|green|#[0-9a-fA-F]{3,6})$/).optional(),
});

const updateNotificationsSchema = z.object({
  notifTasks: z.boolean(),
  notifShare: z.boolean(),
  notifAgenda: z.boolean(),
});

export async function updateProfile(data: unknown) {
  const session = await requireAuth();
  const parsed = updateProfileSchema.safeParse(data);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const user = await db.user.update({
    where: { id: session.userId },
    data: parsed.data,
  });

  // Update session cookie so the sidebar immediately shows the new name
  const ironSession = await getSession();
  ironSession.name = user.name;
  await ironSession.save();

  revalidatePath("/instellingen");
  revalidatePath("/", "layout");
  return { success: true, user };
}

export async function updateNotifications(data: unknown) {
  const session = await requireAuth();
  const parsed = updateNotificationsSchema.safeParse(data);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  await db.user.update({
    where: { id: session.userId },
    data: parsed.data,
  });

  revalidatePath("/instellingen");
  return { success: true };
}

export async function getProfile() {
  const session = await requireAuth();
  return db.user.findUnique({
    where: { id: session.userId },
    select: {
      id: true,
      name: true,
      email: true,
      jobTitle: true,
      avatarPath: true,
      notifTasks: true,
      notifShare: true,
      notifAgenda: true,
    },
  });
}
