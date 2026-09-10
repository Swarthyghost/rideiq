import { notFound } from "next/navigation";
import { requireSessionUser } from "@/lib/session";
import { getBikeWithPayments } from "@/lib/firebase/bikes-admin";
import { computeGraceStatus, computeLiveMissedCount, computeLiveStatus } from "@/lib/payments";
import { getStatusDisplay } from "@/lib/status";
import { formatDateLong, formatGHS } from "@/lib/format";
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
  await requireSessionUser();
  const { id } = await params;
  const bike = await getBikeWithPayments(id);
  if (!bike) notFound();

  const asOf = new Date();
  const missedCount = computeLiveMissedCount(bike.payments, asOf);
  const liveStatus = computeLiveStatus(bike, bike.payments, asOf);
  const status = getStatusDisplay(liveStatus, missedCount, bike.graceAllowance);
  const grace = computeGraceStatus(missedCount, bike.graceAllowance);

  return (
    <div className="flex-1 flex flex-col">
      <BackNav />

      <div className="px-4 sm:px-10 py-6 sm:py-8 pb-14 max-w-[1100px] w-full mx-auto">
        <BikeDetailHeader bike={bike} status={status} grace={grace} />

        <DocumentsRow idDocUrl={bike.idDocUrl} contractDocUrl={bike.contractDocUrl} />

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-white border border-border rounded-xl px-5 sm:px-5.5 py-4.5 mb-7">
          <SummaryItem label="Weekly payment" value={formatGHS(bike.weeklyAmount)} />
          <SummaryItem label="Total contract" value={formatGHS(bike.totalValue)} />
          <SummaryItem label="Start date" value={formatDateLong(bike.startDate)} />
          <SummaryItem label="Schedule" value={`${bike.numPayments} weekly payments`} />
        </div>

        <PaymentScheduleTable bikeId={bike.id} payments={bike.payments} />

        <MissedPaymentLog payments={bike.payments} />
      </div>
    </div>
  );
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[11.5px] font-bold text-muted uppercase tracking-wide">{label}</div>
      <div className="text-[16px] font-extrabold mt-1">{value}</div>
    </div>
  );
}
