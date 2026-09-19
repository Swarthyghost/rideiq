import { notFound } from "next/navigation";
import { isDemoUser, requireSessionUser } from "@/lib/session";
import { getBikeWithPayments } from "@/lib/firebase/bikes-admin";
import {
  collectedTotal,
  computeGraceStatus,
  computeLiveMissedCount,
  computeLiveStatus,
  outstandingTotal,
} from "@/lib/payments";
import { getStatusDisplay } from "@/lib/status";
import { formatDateLong, formatGHS } from "@/lib/format";
import { DemoBanner } from "@/components/DemoBanner";
import { BackNav } from "@/components/Navbar";
import { BikeDetailHeader } from "@/components/BikeDetailHeader";
import { DocumentsRow } from "@/components/DocumentsRow";
import { PaymentScheduleTable } from "@/components/PaymentScheduleTable";
import { MissedPaymentLog } from "@/components/MissedPaymentLog";

export default async function BikeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireSessionUser();
  const demo = isDemoUser(user);
  const { id } = await params;
  const bike = await getBikeWithPayments(id, demo);
  if (!bike) notFound();

  const asOf = new Date();
  const missedCount = computeLiveMissedCount(bike.payments, asOf);
  const liveStatus = computeLiveStatus(bike, bike.payments, asOf);
  const status = getStatusDisplay(liveStatus, missedCount, bike.graceAllowance);
  const grace = computeGraceStatus(missedCount, bike.graceAllowance);
  const amountPaid = collectedTotal(bike.payments);
  const amountLeft = outstandingTotal(bike.payments);

  return (
    <div className="flex-1 flex flex-col">
      {demo && <DemoBanner />}
      <BackNav />

      <div className="px-4 sm:px-10 py-6 sm:py-8 pb-14 max-w-[1100px] w-full mx-auto">
        <BikeDetailHeader bike={bike} status={status} grace={grace} />

        <DocumentsRow bikeId={bike.id} hasIdDoc={!!bike.idDocUrl} hasContractDoc={!!bike.contractDocUrl} />

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 bg-white border border-border rounded-xl px-5 sm:px-5.5 py-4.5 mb-7">
          <SummaryItem label="Weekly payment" value={formatGHS(bike.weeklyAmount)} />
          <SummaryItem label="Total contract" value={formatGHS(bike.totalValue)} />
          <SummaryItem label="Amount paid" value={formatGHS(amountPaid)} color="var(--color-status-ok-fg)" />
          <SummaryItem label="Amount left" value={formatGHS(amountLeft)} color="#3a3630" />
          <SummaryItem label="Start date" value={formatDateLong(bike.startDate)} />
          <SummaryItem label="Schedule" value={`${bike.numPayments} weekly payments`} />
        </div>

        <PaymentScheduleTable bikeId={bike.id} payments={bike.payments} />

        <MissedPaymentLog payments={bike.payments} />
      </div>
    </div>
  );
}

function SummaryItem({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div>
      <div className="text-[11.5px] font-bold text-muted uppercase tracking-wide">{label}</div>
      <div className="text-[16px] font-extrabold mt-1" style={color ? { color } : undefined}>
        {value}
      </div>
    </div>
  );
}
