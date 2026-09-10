import { formatDateShort } from "@/lib/format";
import type { Payment } from "@/lib/types";

export function MissedPaymentLog({ payments }: { payments: Payment[] }) {
  const logRows = payments.filter((p) => p.missedDate !== null);

  return (
    <div>
      <div className="text-[15px] font-extrabold mb-3">Missed payment log</div>
      <div className="bg-white border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <div className="min-w-[560px]">
            <div className="grid grid-cols-[70px_1fr_1fr_1.6fr] px-5 py-3 bg-[#faf0ef] text-[11.5px] font-extrabold text-[#a3271f] uppercase tracking-wide">
              <div>Wk #</div>
              <div>Original due</div>
              <div>Made up on</div>
              <div>Note</div>
            </div>

            {logRows.length === 0 ? (
              <div className="px-5 py-6 text-sm font-semibold text-muted">
                No missed payments on record.
              </div>
            ) : (
              logRows.map((p) => (
                <div
                  key={p.weekNumber}
                  className="grid grid-cols-[70px_1fr_1fr_1.6fr] px-5 py-3 border-t border-hairline items-center text-sm"
                >
                  <div className="font-bold">{p.weekNumber}</div>
                  <div className="font-semibold">{formatDateShort(p.dueDate)}</div>
                  <div className="font-semibold">
                    {p.madeUpDate ? formatDateShort(p.madeUpDate) : "Not yet paid"}
                  </div>
                  <div className="font-semibold text-muted">{p.reason || "—"}</div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
