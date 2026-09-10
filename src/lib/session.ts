import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { DecodedIdToken } from "firebase-admin/auth";
import { adminAuth } from "@/lib/firebase/admin";

export const SESSION_COOKIE_NAME = "__session";
export const SESSION_EXPIRY_MS = 5 * 24 * 60 * 60 * 1000; // 5 days

export async function getSessionUser(): Promise<DecodedIdToken | null> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!sessionCookie) return null;

  try {
    return await adminAuth.verifySessionCookie(sessionCookie, true);
  } catch {
    return null;
  }
}

/** For use in Server Components / pages: redirects to /login if not signed in. */
export async function requireSessionUser(): Promise<DecodedIdToken> {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return user;
}

/** For use in Route Handlers: returns the user, or null if the caller should get a 401. */
export async function requireApiUser(): Promise<DecodedIdToken | null> {
  return getSessionUser();
}
