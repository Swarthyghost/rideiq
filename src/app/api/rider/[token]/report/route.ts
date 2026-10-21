import { NextResponse } from "next/server";
import { reportPaymentByRider } from "@/lib/firebase/bikes-admin";
import { hasRiderAccess } from "@/lib/rider-access";

export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!(await hasRiderAccess(token))) {
    return NextResponse.json({ error: "Please enter your PIN first." }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const weekNumber = Number(body.weekNumber);
  const action = body.action === "cancel" ? "cancel" : "report";
  if (!Number.isInteger(weekNumber) || weekNumber <= 0) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  try {
    await reportPaymentByRider(token, weekNumber, action);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Something went wrong." }, { status: 400 });
  }
}
