import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/session";
import { saveOwnerProfile } from "@/lib/firebase/bikes-admin";

export async function PUT(request: Request) {
  const user = await requireApiUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const firstName = String(body.firstName ?? "").trim();
  const lastName = String(body.lastName ?? "").trim();
  const phone = String(body.phone ?? "").trim();

  if (!firstName || !lastName) {
    return NextResponse.json({ error: "First and last name are required" }, { status: 400 });
  }

  await saveOwnerProfile(user.uid, { firstName, lastName, phone });
  return NextResponse.json({ ok: true });
}
