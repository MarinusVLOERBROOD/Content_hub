"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { deleteFile as deleteFileFromDisk } from "@/lib/file-system";

export async function getTrashedFiles() {
  await requireAdmin();
  return db.file.findMany({
    where: { deletedAt: { not: null } },
    include: {
      client: { select: { name: true, slug: true } },
      uploadedBy: { select: { name: true } },
    },
    orderBy: { deletedAt: "desc" },
  });
}

export async function restoreFile(id: string) {
  await requireAdmin();
  const file = await db.file.findUnique({ where: { id } });
  if (!file) return { error: "Bestand niet gevonden" };

  await db.file.update({ where: { id }, data: { deletedAt: null } });
  revalidatePath("/admin/prullebak");
  return { success: true };
}

export async function permanentDeleteFile(id: string) {
  await requireAdmin();
  const file = await db.file.findUnique({
    where: { id },
    include: { client: true },
  });
  if (!file) return { error: "Bestand niet gevonden" };

  await deleteFileFromDisk(file.client.slug, file.relativePath);
  await db.shareLinkFile.deleteMany({ where: { fileId: id } });
  await db.file.delete({ where: { id } });

  revalidatePath("/admin/prullebak");
  return { success: true };
}
