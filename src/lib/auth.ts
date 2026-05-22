import { redirect } from "next/navigation";
import { getSession, SessionData } from "./session";

export async function requireAuth(): Promise<SessionData> {
  const session = await getSession();
  if (!session.userId) {
    redirect("/login");
  }
  return {
    userId: session.userId,
    email: session.email,
    name: session.name,
    role: session.role,
  };
}

export async function requireAdmin(): Promise<SessionData> {
  const session = await getSession();
  if (!session.userId) {
    redirect("/login");
  }
  if (session.role !== "admin") {
    redirect("/");
  }
  return {
    userId: session.userId,
    email: session.email,
    name: session.name,
    role: session.role,
  };
}

export async function getOptionalSession(): Promise<SessionData | null> {
  const session = await getSession();
  if (!session.userId) return null;
  return {
    userId: session.userId,
    email: session.email,
    name: session.name,
    role: session.role,
  };
}
