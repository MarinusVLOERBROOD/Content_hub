import { NextResponse } from "next/server";
import { validateShareToken } from "@/lib/share-token";
import { db } from "@/lib/db";
import { getStorageProvider } from "@/lib/storage";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const { searchParams } = new URL(req.url);
  const fileId = searchParams.get("fileId");

  const { valid, link } = await validateShareToken(token);
  if (!valid || !link) {
    return NextResponse.json({ error: "Link ongeldig of verlopen" }, { status: 403 });
  }

  if (!fileId) {
    // Return link metadata only
    return NextResponse.json({
      message: link.message,
      recipients: link.recipients,
      expiresAt: link.expiresAt,
      files: link.files.map((f) => ({
        id: f.fileId,
        name: f.file.name,
        mimeType: f.file.mimeType,
        size: f.file.size,
      })),
    });
  }

  const shareFile = link.files.find((f) => f.fileId === fileId);
  if (!shareFile) {
    return NextResponse.json({ error: "Bestand niet in deze deellink" }, { status: 403 });
  }

  try {
    const provider = await getStorageProvider();
    const stream = await provider.createReadStream(
      shareFile.client.slug,
      shareFile.file.relativePath
    );

    // Log download
    await db.shareLinkDownload.create({
      data: {
        shareLinkId: link.id,
        ipAddress: req.headers.get("x-forwarded-for") ?? undefined,
        userAgent: req.headers.get("user-agent") ?? undefined,
      },
    });

    return new Response(stream as unknown as ReadableStream, {
      headers: {
        "Content-Type": shareFile.file.mimeType,
        "Content-Length": shareFile.file.size.toString(),
        "Content-Disposition": `attachment; filename="${encodeURIComponent(shareFile.file.name)}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch {
    return NextResponse.json({ error: "Bestand niet beschikbaar" }, { status: 404 });
  }
}
