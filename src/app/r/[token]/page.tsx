import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { findBikeByRiderToken } from "@/lib/firebase/bikes-admin";
import { hasRiderAccess } from "@/lib/rider-access";
import { buildRiderView } from "@/lib/rider-view";
import { RiderPinGate } from "@/components/RiderPinGate";
import { RiderPortal } from "@/components/RiderPortal";

export const metadata: Metadata = {
  title: "My payments · RiderIQ",
  robots: { index: false, follow: false },
};

export default async function RiderPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  if (!(await hasRiderAccess(token))) {
    const bike = await findBikeByRiderToken(token);
    if (!bike) notFound();
    return <RiderPinGate token={token} />;
  }

  const bike = await findBikeByRiderToken(token);
  if (!bike) notFound();

  return <RiderPortal token={token} view={buildRiderView(bike)} />;
}
