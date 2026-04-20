"use server";

import crypto from "crypto";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { createShareLinkSchema } from "@/lib/validations/share";

export async function createShareLink(data: unknown) {
  const session = await requireAuth();
  const parsed = createShareLinkSchema.safeParse(data);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  // Validate all files exist
  const files = await db.file.findMany({
    where: { id: { in: parsed.data.fileIds } },
    include: { client: true },
  });

  if (files.length !== parsed.data.fileIds.length) {
    return { error: "Een of meer bestanden zijn niet gevonden" };
  }

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + parsed.data.expiresInDays);

  const token = crypto.randomBytes(32).toString("hex");

  const link = await db.shareLink.create({
    data: {
      token,
      recipients: parsed.data.recipients.join(","),
      message: parsed.data.message,
      expiresAt,
      createdById: session.userId,
      files: {
        create: files.map((f) => ({
          fileId: f.id,
          clientId: f.clientId,
        })),
      },
    },
  });

  revalidatePath("/delen");
  return { success: true, token: link.token };
}

export async function revokeShareLink(id: string) {
  const session = await requireAuth();
  const updated = await db.shareLink.updateMany({
    where: { id, createdById: session.userId },
    data: { revokedAt: new Date() },
  });
  if (updated.count === 0) {
    return { error: "Niet bevoegd of link niet gevonden" };
  }
  revalidatePath("/delen");
  return { success: true };
}

export async function getShareLinks() {
  const session = await requireAuth();
  return db.shareLink.findMany({
    where: { createdById: session.userId },
    include: {
      files: {
        include: {
          file: { select: { name: true, size: true } },
        },
      },
      downloads: true,
    },
    orderBy: { createdAt: "desc" },
  });
}
