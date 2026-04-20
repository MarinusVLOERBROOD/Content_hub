import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ clientSlug: string }> }
) {
  await requireAuth();
  const { clientSlug } = await params;
  const { searchParams } = new URL(req.url);
  const folder = searchParams.get("folder") ?? "";

  const client = await db.client.findUnique({ where: { slug: clientSlug } });
  if (!client) return NextResponse.json([], { status: 200 });

  const files = await db.file.findMany({
    where: {
      clientId: client.id,
      ...(folder
        ? { relativePath: { startsWith: folder + "/" } }
        : {}),
    },
    include: { uploadedBy: { select: { name: true } } },
    orderBy: { uploadedAt: "desc" },
  });

  // Filter to only files directly in this folder (not sub-folders)
  const filtered = folder
    ? files.filter((f) => {
        const rest = f.relativePath.substring(folder.length + 1);
        return !rest.includes("/");
      })
    : files.filter((f) => !f.relativePath.includes("/"));

  return NextResponse.json(filtered);
}
