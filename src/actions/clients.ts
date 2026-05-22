"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { createClientSchema, updateClientSchema } from "@/lib/validations/client";
import { slugify, createClientFolders, deleteClientFolders } from "@/lib/client-folders";

export async function getClients() {
  await requireAuth();
  return db.client.findMany({ orderBy: { name: "asc" } });
}

export async function createClient(data: unknown) {
  await requireAuth();
  const parsed = createClientSchema.safeParse(data);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const slug = slugify(parsed.data.name);

  const existing = await db.client.findUnique({ where: { slug } });
  if (existing) return { error: "Er bestaat al een klant met deze naam" };

  const client = await db.client.create({
    data: { name: parsed.data.name, slug },
  });

  // Create folder structure on disk
  await createClientFolders(slug);

  revalidatePath("/bestanden");
  return { success: true, client };
}

export async function updateClient(data: unknown) {
  await requireAuth();
  const parsed = updateClientSchema.safeParse(data);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const client = await db.client.update({
    where: { id: parsed.data.id },
    data: { name: parsed.data.name },
  });

  revalidatePath("/bestanden");
  return { success: true, client };
}

export async function deleteClient(id: string) {
  await requireAuth();

  const client = await db.client.findUnique({ where: { id } });
  if (!client) return { error: "Klant niet gevonden" };

  // Delete all share link files referencing this client
  await db.shareLinkFile.deleteMany({ where: { clientId: id } });

  // Delete all files from DB (cascade handles it, but we also need disk cleanup)
  await deleteClientFolders(client.slug);

  // Delete client (cascades to files)
  await db.client.delete({ where: { id } });

  revalidatePath("/bestanden");
  return { success: true };
}
