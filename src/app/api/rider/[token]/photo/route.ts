import { NextResponse } from "next/server";
import { findBikeByRiderToken } from "@/lib/firebase/bikes-admin";
import { hasRiderAccess } from "@/lib/rider-access";

/** Streams the rider's own photo through our domain so the storage URL never reaches the page. */
export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!(await hasRiderAccess(token))) return new NextResponse(null, { status: 401 });

  const bike = await findBikeByRiderToken(token);
  if (!bike?.riderPhotoUrl) return new NextResponse(null, { status: 404 });

  const sourceUrl = bike.riderPhotoUrl.startsWith("/")
    ? new URL(bike.riderPhotoUrl, _request.url).toString()
    : bike.riderPhotoUrl;
  const upstream = await fetch(sourceUrl);
  if (!upstream.ok || !upstream.body) return new NextResponse(null, { status: 502 });

  return new NextResponse(upstream.body, {
    headers: {
      "Content-Type": upstream.headers.get("content-type") ?? "image/jpeg",
      "Cache-Control": "private, max-age=300",
    },
  });
}
