import { getIronSession, IronSession, SessionOptions } from "iron-session";
import { cookies } from "next/headers";

export interface SessionData {
  userId: string;
  email: string;
  name: string;
  role: "user" | "admin";
}

export async function getSession(): Promise<IronSession<SessionData>> {
  const sessionSecret = process.env.SESSION_SECRET;
  if (!sessionSecret) {
    throw new Error(
      "Missing SESSION_SECRET environment variable. Copy .env.example to .env.local and set a value."
    );
  }
  const sessionOptions: SessionOptions = {
    password: sessionSecret,
    cookieName: "content-hub-session",
    cookieOptions: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 7,
    },
  };
  const cookieStore = await cookies();
  return getIronSession<SessionData>(cookieStore, sessionOptions);
}
