import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  await requireAuth();
  const clients = await db.client.findMany({ orderBy: { name: "asc" } });
  return NextResponse.json(clients);
}
