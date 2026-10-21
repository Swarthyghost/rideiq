import { NextResponse } from "next/server";
import { isDemoUser, requireApiUser } from "@/lib/session";
import { ensureRiderToken } from "@/lib/firebase/bikes-admin";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireApiUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  try {
    const { token, pin } = await ensureRiderToken(id, isDemoUser(user), body.regenerate === true);
    return NextResponse.json({ token, pin });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed" }, { status: 400 });
  }
}
