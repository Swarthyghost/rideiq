import { NextResponse } from "next/server";
import { runMissedPaymentSweep } from "@/lib/firebase/bikes-admin";

// Vercel Cron sends a GET request with an Authorization: Bearer <CRON_SECRET>
// header (set automatically when CRON_SECRET is configured as an env var).
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await runMissedPaymentSweep();
  return NextResponse.json({ ok: true, ...result });
}
