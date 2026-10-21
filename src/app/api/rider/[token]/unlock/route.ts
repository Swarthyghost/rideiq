import { NextResponse } from "next/server";
import { checkRiderPin } from "@/lib/firebase/bikes-admin";
import { RIDER_COOKIE_MAX_AGE, riderCookieName, riderCookieValue } from "@/lib/rider-access";

export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const body = await request.json().catch(() => ({}));
  const pin = String(body.pin ?? "").slice(0, 12);

  const result = await checkRiderPin(token, pin);
  if (!result.ok) {
    if (result.reason === "not-found") return NextResponse.json({ error: "This link isn't valid." }, { status: 404 });
    if (result.reason === "no-phone") {
      return NextResponse.json({ error: "Ask the owner to add your phone number first." }, { status: 400 });
    }
    if (result.reason === "locked") {
      return NextResponse.json(
        { error: `Too many wrong tries. Please try again in ${result.minutesLeft} minutes.` },
        { status: 429 }
      );
    }
    if (result.reason === "wrong") {
      return NextResponse.json(
        { error: `That isn't right. You have ${result.triesLeft} ${result.triesLeft === 1 ? "try" : "tries"} left.` },
        { status: 401 }
      );
    }
  }

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
