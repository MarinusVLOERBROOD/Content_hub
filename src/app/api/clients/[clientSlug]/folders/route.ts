import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getClientFolderTree } from "@/lib/client-folders";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ clientSlug: string }> }
) {
  await requireAuth();
  const { clientSlug } = await params;

  const client = await db.client.findUnique({ where: { slug: clientSlug } });
  if (!client) return NextResponse.json({ error: "Klant niet gevonden" }, { status: 404 });

  const tree = await getClientFolderTree(clientSlug);
  return NextResponse.json(tree);
}
