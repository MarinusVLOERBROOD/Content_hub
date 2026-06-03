import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import fs from "fs";
import path from "path";
import mime from "mime-types";

const MAX_SIZE = 5 * 1024 * 1024;
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

function getAvatarDir() {
  const uploadDir = process.env.UPLOAD_DIR ?? "./uploads";
  return path.resolve(process.cwd(), uploadDir, "avatars");
}

export async function POST(req: Request) {
  const session = await requireAuth();
  const formData = await req.formData();
  const file = formData.get("file") as File | null;

  if (!file) return NextResponse.json({ error: "Geen bestand" }, { status: 400 });
  if (file.size > MAX_SIZE) return NextResponse.json({ error: "Bestand te groot (max 5 MB)" }, { status: 413 });

  const mimeType = (mime.lookup(file.name) || file.type) as string;
  if (!ALLOWED.has(mimeType)) return NextResponse.json({ error: "Alleen afbeeldingen toegestaan (jpg/png/webp/gif)" }, { status: 415 });

  const ext = mime.extension(mimeType) || "jpg";
  const avatarDir = getAvatarDir();

  // Remove old avatar file if extension changed
  const existing = await db.user.findUnique({ where: { id: session.userId }, select: { avatarPath: true } });
  if (existing?.avatarPath) {
    try { fs.unlinkSync(path.join(avatarDir, path.basename(existing.avatarPath))); } catch {}
  }

  const filename = `${session.userId}.${ext}`;
  await fs.promises.mkdir(avatarDir, { recursive: true });
  const buffer = Buffer.from(await file.arrayBuffer());
  await fs.promises.writeFile(path.join(avatarDir, filename), buffer);

  await db.user.update({
    where: { id: session.userId },
    data: { avatarPath: filename },
  });

  return NextResponse.json({ success: true });
}

export async function DELETE() {
  const session = await requireAuth();

  const user = await db.user.findUnique({ where: { id: session.userId }, select: { avatarPath: true } });
  if (user?.avatarPath) {
    try { fs.unlinkSync(path.join(getAvatarDir(), path.basename(user.avatarPath))); } catch {}
  }

  await db.user.update({
    where: { id: session.userId },
    data: { avatarPath: null },
  });

  return NextResponse.json({ success: true });
}
