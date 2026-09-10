/**
 * One-time setup: creates (or promotes) the single admin user for RiderIQ
 * and sets the `admin: true` custom claim that firestore.rules / storage.rules
 * check to authorize access.
 *
 * Usage:
 *   ADMIN_EMAIL=you@business.com ADMIN_PASSWORD='a-strong-password' npx tsx scripts/setup-admin.ts
 *
 * Requires the same FIREBASE_PROJECT_ID / FIREBASE_CLIENT_EMAIL / FIREBASE_PRIVATE_KEY
 * env vars used by the app's server-side Firebase Admin SDK (see .env.local.example).
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { cert, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

async function main() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !password) {
    console.error("Set ADMIN_EMAIL and ADMIN_PASSWORD environment variables and re-run.");
    process.exit(1);
  }
  if (password.length < 6) {
    console.error("ADMIN_PASSWORD must be at least 6 characters (Firebase Auth's minimum).");
    process.exit(1);
  }

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!projectId || !clientEmail || !privateKey) {
    console.error(
      "Missing FIREBASE_PROJECT_ID / FIREBASE_CLIENT_EMAIL / FIREBASE_PRIVATE_KEY. Set them in .env.local."
    );
    process.exit(1);
  }

  initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
  const auth = getAuth();

  let uid: string;
  try {
    const existing = await auth.getUserByEmail(email);
    uid = existing.uid;
    await auth.updateUser(uid, { password });
    console.log(`Updated password for existing admin user ${email} (${uid}).`);
  } catch {
    const created = await auth.createUser({ email, password });
    uid = created.uid;
    console.log(`Created admin user ${email} (${uid}).`);
  }

  await auth.setCustomUserClaims(uid, { admin: true });
  console.log("Set admin custom claim. This user can now sign in to RiderIQ.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
