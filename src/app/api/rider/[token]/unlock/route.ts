import { NextResponse } from "next/server";
import { checkRiderPin } from "@/lib/firebase/bikes-admin";
import { RIDER_COOKIE_MAX_AGE, pinFailureResponse, riderCookieName, riderCookieValue } from "@/lib/rider-access";

export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const body = await request.json().catch(() => ({}));
  const pin = String(body.pin ?? "").slice(0, 12);

  const result = await checkRiderPin(token, pin);
  if (!result.ok) return pinFailureResponse(result);

  const response = NextResponse.json({ ok: true });
  response.cookies.set(riderCookieName(token), riderCookieValue(token), {
    maxAge: RIDER_COOKIE_MAX_AGE,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    sameSite: "lax",
  });
  return response;
}
