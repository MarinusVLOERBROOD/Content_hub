import { NextResponse } from "next/server";
import { getOptionalSession } from "@/lib/auth";

export async function GET() {
  const session = await getOptionalSession();
  if (!session) return NextResponse.json(null, { status: 401 });
  return NextResponse.json(session);
}
