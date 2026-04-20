"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { z } from "zod";

const colorValues = ["teal", "blue", "purple", "red", "orange", "green"] as const;

const createUserSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(["user", "admin"]).default("user"),
  jobTitle: z.string().optional(),
  color: z.enum(colorValues).default("teal"),
});

const updateUserSchema = z.object({
  id: z.string(),
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  password: z.string().min(8).optional(),
  role: z.enum(["user", "admin"]).optional(),
  jobTitle: z.string().optional(),
  color: z.enum(colorValues).optional(),
});

export async function getUsers() {
  await requireAdmin();
  return db.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      jobTitle: true,
      color: true,
      createdAt: true,
    },
    orderBy: { name: "asc" },
  });
}

export async function createUser(data: unknown) {
  await requireAdmin();
  const parsed = createUserSchema.safeParse(data);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const existing = await db.user.findUnique({ where: { email: parsed.data.email } });
  if (existing) return { error: "E-mailadres al in gebruik" };

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);
  const user = await db.user.create({
    data: {
      name: parsed.data.name,
      email: parsed.data.email,
      passwordHash,
      role: parsed.data.role,
      jobTitle: parsed.data.jobTitle,
      color: parsed.data.color,
    },
    select: { id: true, name: true, email: true, role: true, jobTitle: true, color: true, createdAt: true },
  });

  revalidatePath("/admin/gebruikers");
  return { success: true, user };
}

export async function updateUser(data: unknown) {
  await requireAdmin();
  const parsed = updateUserSchema.safeParse(data);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const { id, password, ...rest } = parsed.data;
  const updateData: Record<string, unknown> = { ...rest };

  if (password) {
    updateData.passwordHash = await bcrypt.hash(password, 10);
  }

  const user = await db.user.update({
    where: { id },
    data: updateData,
    select: { id: true, name: true, email: true, role: true, jobTitle: true, color: true, createdAt: true },
  });

  revalidatePath("/admin/gebruikers");
  return { success: true, user };
}

export async function deleteUser(id: string) {
  await requireAdmin();
  await db.user.delete({ where: { id } });
  revalidatePath("/admin/gebruikers");
  return { success: true };
}
