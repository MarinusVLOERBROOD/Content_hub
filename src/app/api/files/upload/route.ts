import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { saveUploadedFile } from "@/lib/file-system";
import mime from "mime-types";

// 500 MB max upload size
const MAX_FILE_SIZE = 500 * 1024 * 1024;

// Allowed MIME types whitelist
const ALLOWED_MIME_TYPES = new Set([
  // Images
  "image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml",
  "image/tiff", "image/bmp", "image/heic", "image/heif",
  // Video
  "video/mp4", "video/quicktime", "video/x-msvideo", "video/x-matroska",
  "video/webm", "video/mpeg", "video/ogg",
  // Audio
  "audio/mpeg", "audio/wav", "audio/ogg", "audio/aac", "audio/flac",
  "audio/x-flac", "audio/webm",
  // Documents
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  // Text
  "text/plain", "text/csv", "text/html", "text/xml", "application/json",
  // Archives
  "application/zip", "application/x-zip-compressed",
  "application/x-rar-compressed", "application/x-7z-compressed",
  // Fonts
  "font/ttf", "font/otf", "font/woff", "font/woff2",
]);

function sanitizeFolderPath(p: string): string {
  // Reject absolute paths or path traversal
  if (!p) return "";
  const parts = p.split("/").filter((seg) => seg && seg !== "." && seg !== "..");
  return parts.join("/");
}

export async function POST(req: Request) {
  const session = await requireAuth();

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const clientSlug = formData.get("clientSlug") as string;
  const rawFolderPath = (formData.get("folderPath") as string) ?? "";

  if (!file || !clientSlug) {
    return NextResponse.json({ error: "Bestand en klant zijn verplicht" }, { status: 400 });
  }

  // Size check before reading into memory
  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      { error: "Bestand is te groot (max 500 MB)" },
      { status: 413 }
    );
  }

  // MIME type whitelist — use extension-based lookup as ground truth, not client-provided type
  const detectedMime = mime.lookup(file.name) || file.type || "";
  if (!ALLOWED_MIME_TYPES.has(detectedMime)) {
    return NextResponse.json(
      { error: "Bestandstype niet toegestaan" },
      { status: 415 }
    );
  }

  const folderPath = sanitizeFolderPath(rawFolderPath);

  const [client, user] = await Promise.all([
    db.client.findUnique({ where: { slug: clientSlug } }),
    db.user.findUnique({ where: { id: session.userId } }),
  ]);
  if (!client) {
    return NextResponse.json({ error: "Klant niet gevonden" }, { status: 404 });
  }
  if (!user) {
    return NextResponse.json({ error: "Gebruiker niet gevonden" }, { status: 401 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  try {
    const relativePath = await saveUploadedFile(
      clientSlug,
      folderPath,
      file.name,
      buffer,
      detectedMime
    );

    const record = await db.file.upsert({
      where: { clientId_relativePath: { clientId: client.id, relativePath } },
      create: {
        name: file.name,
        originalName: file.name,
        mimeType: detectedMime,
        size: buffer.length,
        relativePath,
        clientId: client.id,
        uploadedById: session.userId,
      },
      update: {
        size: buffer.length,
        uploadedById: session.userId,
      },
    });

    return NextResponse.json(record);
  } catch (err) {
    console.error("Upload error:", err);
    return NextResponse.json({ error: "Upload mislukt" }, { status: 500 });
  }
}
