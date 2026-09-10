import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/session";
import { updateBikeTerms } from "@/lib/firebase/bikes-admin";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireApiUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await request.json();

  const bikeModel = String(body.bikeModel ?? "").trim();
  const riderName = String(body.riderName ?? "").trim();
  const riderPhone = String(body.riderPhone ?? "").trim();
  const status = String(body.status ?? "active");
  const weeklyAmount = Number(body.weeklyAmount);
  const totalValue = Number(body.totalValue);

  if (!bikeModel || !riderName || !riderPhone) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }
  if (!Number.isFinite(weeklyAmount) || weeklyAmount <= 0) {
    return NextResponse.json({ error: "Invalid weekly amount" }, { status: 400 });
  }
  if (!Number.isFinite(totalValue) || totalValue <= 0) {
    return NextResponse.json({ error: "Invalid total balance" }, { status: 400 });
  }

  const validStatuses = ["active", "repossession_flagged", "repossessed", "completed"];
  if (!validStatuses.includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  await updateBikeTerms(id, {
    bikeModel,
    plateNumber: String(body.plateNumber ?? "").trim(),
    riderName,
    riderPhone,
    status: status as "active" | "repossession_flagged" | "repossessed" | "completed",
    weeklyAmount,
    totalValue,
    riderPhotoUrl: "riderPhotoUrl" in body ? body.riderPhotoUrl : undefined,
    idDocUrl: "idDocUrl" in body ? body.idDocUrl : undefined,
    contractDocUrl: "contractDocUrl" in body ? body.contractDocUrl : undefined,
  });

  return NextResponse.json({ ok: true });
}
