import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import fs from "fs";
import path from "path";
import mime from "mime-types";

function getAvatarDir() {
  const uploadDir = process.env.UPLOAD_DIR ?? "./uploads";
  return path.resolve(process.cwd(), uploadDir, "avatars");
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  await requireAuth();
  const { userId } = await params;

  const user = await db.user.findUnique({ where: { id: userId }, select: { avatarPath: true } });
  if (!user?.avatarPath) return NextResponse.json({ error: "Geen avatar" }, { status: 404 });

  // Prevent path traversal
  const filename = path.basename(user.avatarPath);
  const fp = path.join(getAvatarDir(), filename);

  try {
    const buffer = await fs.promises.readFile(fp);
    const mimeType = (mime.lookup(filename) || "image/jpeg") as string;
    return new Response(buffer, {
      headers: {
        "Content-Type": mimeType,
        "Cache-Control": "private, max-age=300",
      },
    });
  } catch {
    return NextResponse.json({ error: "Niet gevonden" }, { status: 404 });
  }
}
