import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ clientSlug: string }> }
) {
  await requireAuth();
  const { clientSlug } = await params;

  const client = await db.client.findUnique({ where: { slug: clientSlug } });
  if (!client) return NextResponse.json([], { status: 200 });

  const files = await db.file.findMany({
    where: { clientId: client.id },
    orderBy: { uploadedAt: "desc" },
  });

  return NextResponse.json(files);
}
