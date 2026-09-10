import Link from "next/link";
import { Avatar } from "@/components/Avatar";
import { StatusPill } from "@/components/StatusPill";
import { ProgressBar } from "@/components/ProgressBar";
import { ChevronRightIcon } from "@/components/icons";
import { formatGHS } from "@/lib/format";
import { getStatusDisplay, getNextPaymentInfo } from "@/lib/status";
import { collectedTotal, computeLiveMissedCount, computeLiveStatus, paidCount } from "@/lib/payments";
import type { BikeWithPayments } from "@/lib/types";

export function BikeCard({ bike }: { bike: BikeWithPayments }) {
  const asOf = new Date();
  const missedCount = computeLiveMissedCount(bike.payments, asOf);
  const liveStatus = computeLiveStatus(bike, bike.payments, asOf);
  const status = getStatusDisplay(liveStatus, missedCount, bike.graceAllowance);
  const paid = paidCount(bike.payments);
  const paidAmt = collectedTotal(bike.payments);
  const pct = bike.numPayments > 0 ? Math.round((paid / bike.numPayments) * 100) : 0;
  const next = getNextPaymentInfo(bike.payments, liveStatus, missedCount);

  return (
    <div className="card bg-white border border-border rounded-[14px] p-4 sm:p-5 flex flex-col gap-3 sm:gap-3.5 transition-all hover:shadow-[0_6px_18px_rgba(28,42,36,0.10)] hover:-translate-y-px">
      <div className="flex items-start justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <Avatar name={bike.riderName} photoUrl={bike.riderPhotoUrl} size={38} />
          <div className="min-w-0">
            <div className="text-[15px] sm:text-[16.5px] font-extrabold leading-tight">{bike.riderName}</div>
            <div className="text-[12px] sm:text-[13px] text-muted font-semibold mt-0.5 truncate">
              {bike.bikeModel}
              {bike.plateNumber ? ` · ${bike.plateNumber}` : ""}
            </div>
          </div>
        </div>
        <div className="flex-shrink-0">
          <StatusPill status={status} />
        </div>
      </div>

      <div>
        <div className="flex justify-between text-[11.5px] sm:text-[12.5px] font-bold text-muted mb-1.5 gap-2">
          <span>{paid} of {bike.numPayments} paid</span>
          <span className="text-right">{formatGHS(paidAmt)} / {formatGHS(bike.totalValue)}</span>
        </div>
        <ProgressBar pct={pct} color={status.barColor} />
      </div>

      <div className="border-t border-hairline pt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <div className="text-[11px] sm:text-[11.5px] font-bold text-muted uppercase tracking-wide">
            Next payment
          </div>
          <div className="text-[13px] sm:text-[13.5px] font-bold mt-0.5" style={{ color: next.color }}>
            {next.label}
          </div>
        </div>
        <Link
          href={`/bikes/${bike.id}`}
          className="text-[13px] sm:text-[13.5px] font-bold flex items-center gap-1 text-[#1f6b45] hover:text-[#14532d] self-start sm:self-auto"
        >
          View schedule
          <ChevronRightIcon />
        </Link>
      </div>
    </div>
  );
}
