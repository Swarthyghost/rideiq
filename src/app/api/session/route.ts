import { NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebase/admin";
import { SESSION_COOKIE_NAME, SESSION_EXPIRY_MS } from "@/lib/session";

export async function POST(request: Request) {
  const { idToken } = await request.json();
  if (!idToken || typeof idToken !== "string") {
    return NextResponse.json({ error: "Missing idToken" }, { status: 400 });
  }

  try {
    // Reject tokens issued more than 5 minutes ago, per Firebase's session-cookie guidance.
    const decoded = await adminAuth.verifyIdToken(idToken);
    if (Date.now() / 1000 - decoded.auth_time > 5 * 60) {
      return NextResponse.json({ error: "Recent sign-in required" }, { status: 401 });
    }

    const sessionCookie = await adminAuth.createSessionCookie(idToken, {
      expiresIn: SESSION_EXPIRY_MS,
    });

    const response = NextResponse.json({ ok: true });
    response.cookies.set(SESSION_COOKIE_NAME, sessionCookie, {
      maxAge: SESSION_EXPIRY_MS / 1000,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      path: "/",
      sameSite: "lax",
    });
    return response;
  } catch {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE_NAME, "", { maxAge: 0, path: "/" });
  return response;
}
