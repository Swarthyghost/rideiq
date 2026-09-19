import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/session";
import { createBike } from "@/lib/firebase/bikes-admin";
import type { NewBikeInput } from "@/lib/types";

export async function POST(request: Request) {
  const user = await requireApiUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();

  const bikeModel = String(body.bikeModel ?? "").trim();
  const riderName = String(body.riderName ?? "").trim();
  const riderPhone = String(body.riderPhone ?? "").trim();
  const startDate = String(body.startDate ?? "").trim();
  const weeklyAmount = Number(body.weeklyAmount);
  const numPayments = Number(body.numPayments);

  if (!bikeModel || !riderName || !riderPhone || !startDate) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }
  if (!Number.isFinite(weeklyAmount) || weeklyAmount <= 0) {
    return NextResponse.json({ error: "Invalid weekly amount" }, { status: 400 });
  }
  if (!Number.isInteger(numPayments) || numPayments <= 0) {
    return NextResponse.json({ error: "Invalid number of payments" }, { status: 400 });
  }

  const capitalRaw = body.capitalInvested;
  const capitalInvested =
    capitalRaw === null || capitalRaw === undefined || capitalRaw === "" ? null : Number(capitalRaw);
  if (capitalInvested !== null && (!Number.isFinite(capitalInvested) || capitalInvested < 0)) {
    return NextResponse.json({ error: "Invalid capital invested" }, { status: 400 });
  }

  const input: NewBikeInput = {
    bikeModel,
    plateNumber: String(body.plateNumber ?? "").trim(),
    riderName,
    riderPhone,
    startDate,
    weeklyAmount,
    numPayments,
    riderPhotoUrl: body.riderPhotoUrl ?? null,
    idDocUrl: body.idDocUrl ?? null,
    contractDocUrl: body.contractDocUrl ?? null,
    capitalInvested,
  };

  const bikeId = await createBike(input);
  return NextResponse.json({ ok: true, bikeId });
}
