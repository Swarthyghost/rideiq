import { NextResponse } from "next/server";
import { isDemoUser, requireApiUser } from "@/lib/session";
import { markPaymentMissed } from "@/lib/firebase/bikes-admin";

export async function POST(request: Request) {
  const user = await requireApiUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const bikeId = String(body.bikeId ?? "");
  const weekNumber = Number(body.weekNumber);
  const reason = body.reason ? String(body.reason).trim() : null;

  if (!bikeId || !Number.isInteger(weekNumber) || weekNumber <= 0) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  try {
    await markPaymentMissed(bikeId, weekNumber, reason, isDemoUser(user));
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to mark payment missed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
