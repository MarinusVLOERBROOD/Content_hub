import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getStorageProvider } from "@/lib/storage";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ fileId: string }> }
) {
  await requireAuth();
  const { fileId } = await params;

  const file = await db.file.findUnique({
    where: { id: fileId },
    include: { client: true },
  });
  if (!file) return NextResponse.json({ error: "Niet gevonden" }, { status: 404 });

  try {
    const provider = await getStorageProvider();
    const stream = await provider.createReadStream(file.client.slug, file.relativePath);

    return new Response(stream as unknown as ReadableStream, {
      headers: {
        "Content-Type": file.mimeType,
        "Content-Length": file.size.toString(),
        "Content-Disposition": `attachment; filename="${encodeURIComponent(file.name)}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch {
    return NextResponse.json({ error: "Bestand niet beschikbaar" }, { status: 404 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ fileId: string }> }
) {
  await requireAuth();
  const { fileId } = await params;

  const file = await db.file.findUnique({
    where: { id: fileId },
    include: { client: true },
  });
  if (!file) return NextResponse.json({ error: "Niet gevonden" }, { status: 404 });

  const provider = await getStorageProvider();
  await provider.deleteFile(file.client.slug, file.relativePath);
  await db.file.delete({ where: { id: fileId } });

  return NextResponse.json({ success: true });
}
