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

  if (!bikeModel || !riderName || !riderPhone) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
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
  });

  return NextResponse.json({ ok: true });
}
