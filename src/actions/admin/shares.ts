"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export async function getAllShareLinks() {
  await requireAdmin();
  return db.shareLink.findMany({
    include: {
      createdBy: { select: { name: true, email: true } },
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

export async function adminReactivateShareLink(id: string) {
  await requireAdmin();

  const link = await db.shareLink.findUnique({ where: { id } });
  if (!link) return { error: "Link niet gevonden" };

  const now = new Date();
  const isExpired = link.expiresAt < now;

  await db.shareLink.update({
    where: { id },
    data: {
      revokedAt: null,
      ...(isExpired
        ? { expiresAt: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000) }
        : {}),
    },
  });

  revalidatePath("/admin/deellinks");
  return { success: true };
}

export async function adminDeleteShareLink(id: string) {
  await requireAdmin();
  await db.shareLink.delete({ where: { id } });
  revalidatePath("/admin/deellinks");
  return { success: true };
}
