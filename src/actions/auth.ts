"use server";

import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { requireAuth } from "@/lib/auth";
import { loginSchema, changePasswordSchema } from "@/lib/validations/auth";
import { z } from "zod";

export async function login(formData: FormData) {
  const raw = {
    email: formData.get("email") as string,
    password: formData.get("password") as string,
  };

  const parsed = loginSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const user = await db.user.findUnique({ where: { email: parsed.data.email } });
  if (!user) {
    return { error: "Onjuist e-mailadres of wachtwoord" };
  }

  const valid = await bcrypt.compare(parsed.data.password, user.passwordHash);
  if (!valid) {
    return { error: "Onjuist e-mailadres of wachtwoord" };
  }

  const session = await getSession();
  session.userId = user.id;
  session.email = user.email;
  session.name = user.name;
  session.role = user.role as "user" | "admin";
  await session.save();

  redirect("/");
}

export async function logout() {
  const session = await getSession();
  session.destroy();
  redirect("/login");
}

export async function changePassword(formData: FormData) {
  const currentUser = await requireAuth();

  const raw = {
    currentPassword: formData.get("currentPassword") as string,
    newPassword: formData.get("newPassword") as string,
    confirmPassword: formData.get("confirmPassword") as string,
  };

  const parsed = changePasswordSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const user = await db.user.findUnique({ where: { id: currentUser.userId } });
  if (!user) return { error: "Gebruiker niet gevonden" };

  const valid = await bcrypt.compare(parsed.data.currentPassword, user.passwordHash);
  if (!valid) return { error: "Huidig wachtwoord onjuist" };

  const newHash = await bcrypt.hash(parsed.data.newPassword, 10);
  await db.user.update({
    where: { id: currentUser.userId },
    data: { passwordHash: newHash },
  });

  return { success: true };
}
