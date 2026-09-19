import { NextResponse } from "next/server";
import { createHash } from "crypto";
import { isDemoUser, requireApiUser } from "@/lib/session";

export async function POST(request: Request) {
  const user = await requireApiUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (isDemoUser(user)) {
    return NextResponse.json({ error: "Uploads are turned off in the demo." }, { status: 403 });
  }

  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  if (!apiKey || !apiSecret || !cloudName) {
    return NextResponse.json({ error: "Cloudinary is not configured." }, { status: 500 });
  }

  const body = await request.json();
  const folder = String(body.folder ?? "").trim();
  if (!folder) {
    return NextResponse.json({ error: "Missing folder" }, { status: 400 });
  }

  const timestamp = Math.floor(Date.now() / 1000);

  // Cloudinary's signing rule: sort every param that will accompany the
  // upload (other than file/api_key/cloud_name/signature) alphabetically,
  // join as key=value pairs, then SHA-1 the string with the secret appended.
  const paramsToSign: Record<string, string | number> = { folder, timestamp };
  const toSign = Object.keys(paramsToSign)
    .sort()
    .map((key) => `${key}=${paramsToSign[key]}`)
    .join("&");
  const signature = createHash("sha1").update(toSign + apiSecret).digest("hex");

  return NextResponse.json({ signature, timestamp, apiKey, cloudName, folder });
}
