import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/session";
import { getBikeDocUrls, type BikeDocUrls } from "@/lib/firebase/bikes-admin";

const FIELD_BY_DOC_TYPE: Record<string, keyof BikeDocUrls> = {
  photo: "riderPhotoUrl",
  "id-doc": "idDocUrl",
  contract: "contractDocUrl",
};

/**
 * Streams a rider's photo/ID/contract through our own domain instead of
 * ever handing the client a res.cloudinary.com URL -- the browser's address
 * bar (and anything a viewer might copy/share) only ever shows this route,
 * never the underlying Cloudinary cloud name or asset path.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ bikeId: string; docType: string }> }
) {
  const user = await requireApiUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { bikeId, docType } = await params;
  const field = FIELD_BY_DOC_TYPE[docType];
  if (!field) return NextResponse.json({ error: "Invalid document type" }, { status: 400 });

  const docs = await getBikeDocUrls(bikeId);
  const sourceUrl = docs?.[field];
  if (!sourceUrl) return NextResponse.json({ error: "Document not found" }, { status: 404 });

  const upstream = await fetch(sourceUrl);
  if (!upstream.ok || !upstream.body) {
    return NextResponse.json({ error: "Couldn't retrieve the document" }, { status: 502 });
  }

  return new NextResponse(upstream.body, {
    status: 200,
    headers: {
      "Content-Type": upstream.headers.get("content-type") ?? "application/octet-stream",
      "Content-Disposition": "inline",
      "Cache-Control": "private, max-age=300",
    },
  });
}
