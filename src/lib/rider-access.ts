import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

export const RIDER_COOKIE_MAX_AGE = 60 * 60 * 24 * 30;

export function riderCookieName(token: string): string {
  return `ra_${token.slice(0, 12)}`;
}

function sign(token: string): string {
  const key = process.env.FIREBASE_PRIVATE_KEY;
  if (!key) throw new Error("Server secret is not configured");
  return createHmac("sha256", key).update(`rider-access:${token}`).digest("base64url");
}

/** Value stored in the cookie once the rider has entered the right PIN. */
export function riderCookieValue(token: string): string {
  return sign(token);
}

/** True only when this browser has already passed the PIN check for this exact link. */
export async function hasRiderAccess(token: string): Promise<boolean> {
  const store = await cookies();
  const value = store.get(riderCookieName(token))?.value;
  if (!value) return false;
  const expected = sign(token);
  return value.length === expected.length && timingSafeEqual(Buffer.from(value), Buffer.from(expected));
}
