import { NextResponse } from "next/server";
import { validateShareToken } from "@/lib/share-token";
import { db } from "@/lib/db";
import { getStorageProvider } from "@/lib/storage";
import archiver from "archiver";
import { Readable } from "stream";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const { valid, link } = await validateShareToken(token);
  if (!valid || !link) {
    return NextResponse.json({ error: "Link ongeldig of verlopen" }, { status: 403 });
  }

  const provider = await getStorageProvider();
  const archive = archiver("zip", { zlib: { level: 6 } });

  for (const shareFile of link.files) {
    try {
      const buf = await provider.readBuffer(
        shareFile.client.slug,
        shareFile.file.relativePath
      );
      archive.append(buf, { name: shareFile.file.name });
    } catch {
      // Skip files that can't be read
    }
  }

  archive.finalize();

  await db.shareLinkDownload.create({
    data: {
      shareLinkId: link.id,
      ipAddress: req.headers.get("x-forwarded-for") ?? undefined,
      userAgent: req.headers.get("user-agent") ?? undefined,
    },
  });

  const readable = Readable.from(archive);

  return new Response(readable as unknown as ReadableStream, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="bestanden.zip"`,
      "Cache-Control": "private, no-store",
    },
  });
}
