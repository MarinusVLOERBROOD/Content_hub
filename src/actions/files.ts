"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { deleteFile as deleteFileFromDisk, moveFile as moveFileOnDisk } from "@/lib/file-system";

/** Remove characters unsafe for filenames; mirrors safeName() in file-system.ts */
function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._\-\s]/g, "_").trim();
}

/** Validate a folder path has no traversal or absolute segments */
function sanitizeFolderPath(p: string): string {
  const parts = p.split("/").filter((seg) => seg && seg !== "." && seg !== "..");
  return parts.join("/");
}

export async function getClientFiles(clientSlug: string) {
  await requireAuth();
  const client = await db.client.findUnique({ where: { slug: clientSlug } });
  if (!client) return [];
  return db.file.findMany({
    where: { clientId: client.id },
    include: { uploadedBy: { select: { name: true } } },
    orderBy: { uploadedAt: "desc" },
  });
}

export async function deleteFile(fileId: string) {
  await requireAuth();

  const file = await db.file.findUnique({
    where: { id: fileId },
    include: { client: true },
  });
  if (!file) return { error: "Bestand niet gevonden" };

  await deleteFileFromDisk(file.client.slug, file.relativePath);
  await db.file.delete({ where: { id: fileId } });

  revalidatePath(`/bestanden/${file.client.slug}`);
  return { success: true };
}

export async function renameFile(fileId: string, newName: string) {
  await requireAuth();

  const file = await db.file.findUnique({
    where: { id: fileId },
    include: { client: true },
  });
  if (!file) return { error: "Bestand niet gevonden" };

  const safeName = sanitizeFileName(newName);
  if (!safeName) return { error: "Ongeldige bestandsnaam" };

  const dir = file.relativePath.includes("/")
    ? file.relativePath.substring(0, file.relativePath.lastIndexOf("/"))
    : "";
  const newRelativePath = dir ? `${dir}/${safeName}` : safeName;

  // Move on disk
  await moveFileOnDisk(file.client.slug, file.relativePath, newRelativePath);

  // Update DB
  await db.file.update({
    where: { id: fileId },
    data: { name: newName, relativePath: newRelativePath },
  });

  revalidatePath(`/bestanden/${file.client.slug}`);
  return { success: true };
}

export async function moveFile(fileId: string, newFolder: string) {
  await requireAuth();

  const file = await db.file.findUnique({
    where: { id: fileId },
    include: { client: true },
  });
  if (!file) return { error: "Bestand niet gevonden" };

  const safeFolder = sanitizeFolderPath(newFolder);
  const fileName = file.relativePath.includes("/")
    ? file.relativePath.substring(file.relativePath.lastIndexOf("/") + 1)
    : file.relativePath;
  const newRelativePath = safeFolder ? `${safeFolder}/${fileName}` : fileName;

  await moveFileOnDisk(file.client.slug, file.relativePath, newRelativePath);

  await db.file.update({
    where: { id: fileId },
    data: { relativePath: newRelativePath },
  });

  revalidatePath(`/bestanden/${file.client.slug}`);
  return { success: true };
}
