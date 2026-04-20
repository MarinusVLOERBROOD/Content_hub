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
        "Content-Disposition": "inline",
        "Cache-Control": "private, max-age=3600",
        "X-Content-Type-Options": "nosniff",
        // Prevent XSS via SVG/HTML files loaded inline
        "Content-Security-Policy": "default-src 'none'; img-src 'self' data:; media-src 'self'; style-src 'unsafe-inline'",
      },
    });
  } catch {
    return NextResponse.json({ error: "Bestand niet beschikbaar" }, { status: 404 });
  }
}
