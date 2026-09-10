import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/session";
import { markPaymentPaid } from "@/lib/firebase/bikes-admin";

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

  await markPaymentPaid(bikeId, weekNumber, reason);
  return NextResponse.json({ ok: true });
}
