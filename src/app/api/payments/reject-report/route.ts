import { NextResponse } from "next/server";
import { isDemoUser, requireApiUser } from "@/lib/session";
import { rejectPaymentReport } from "@/lib/firebase/bikes-admin";

export async function POST(request: Request) {
  const user = await requireApiUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const bikeId = String(body.bikeId ?? "");
  const weekNumber = Number(body.weekNumber);
  if (!bikeId || !Number.isInteger(weekNumber) || weekNumber <= 0) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  try {
    await rejectPaymentReport(bikeId, weekNumber, isDemoUser(user));
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed" }, { status: 400 });
  }
}
