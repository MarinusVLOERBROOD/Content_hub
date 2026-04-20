import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { unsealData } from "iron-session";
import type { SessionData } from "./lib/session";

const SESSION_SECRET = process.env.SESSION_SECRET!;
const COOKIE_NAME = "content-hub-session";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Public paths — no auth required
  if (
    pathname.startsWith("/login") ||
    pathname.startsWith("/download") ||
    pathname.startsWith("/api/download") ||
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico"
  ) {
    const res = NextResponse.next();
    addSecurityHeaders(res);
    return res;
  }

  // Read and verify session cookie
  const cookieValue = request.cookies.get(COOKIE_NAME)?.value;

  if (!cookieValue) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  try {
    const session = await unsealData<SessionData>(cookieValue, {
      password: SESSION_SECRET,
    });

    if (!session.userId) {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    // Admin-only routes
    if (pathname.startsWith("/admin") && session.role !== "admin") {
      return NextResponse.redirect(new URL("/", request.url));
    }

    const res = NextResponse.next();
    addSecurityHeaders(res);
    return res;
  } catch {
    // Invalid/tampered cookie
    const response = NextResponse.redirect(new URL("/login", request.url));
    response.cookies.delete(COOKIE_NAME);
    return response;
  }
}

function addSecurityHeaders(res: NextResponse) {
  res.headers.set("X-Frame-Options", "DENY");
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  res.headers.set("X-XSS-Protection", "1; mode=block");
  res.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
