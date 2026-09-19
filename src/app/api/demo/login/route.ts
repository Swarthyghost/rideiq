import { NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebase/admin";
import { DEMO_OWNER, resetDemoData } from "@/lib/firebase/bikes-admin";

/** Public on purpose: it only ever opens the sandboxed demo fleet, never real data. */
export async function POST() {
  try {
    await resetDemoData();

    try {
      await adminAuth.getUser(DEMO_OWNER.uid);
    } catch {
      await adminAuth.createUser({ uid: DEMO_OWNER.uid, email: DEMO_OWNER.email, displayName: "Demo Owner" });
    }

    const token = await adminAuth.createCustomToken(DEMO_OWNER.uid, { demo: true });
    return NextResponse.json({ token });
  } catch (err) {
    console.error("Demo login failed:", err);
    return NextResponse.json({ error: "Couldn't start the demo." }, { status: 500 });
  }
}
