import { formatDateShort } from "@/lib/format";
import type { Payment } from "@/lib/types";

export function MissedPaymentLog({ payments }: { payments: Payment[] }) {
  const logRows = payments.filter((p) => p.missedDate !== null);

  return (
    <div>
      <div className="text-[15px] font-extrabold mb-3">Missed payment log</div>

      {logRows.length === 0 ? (
        <div className="bg-white border border-border rounded-xl px-5 py-6 text-sm font-semibold text-muted">
          No missed payments on record.
        </div>
      ) : (
        <>
          {/* Mobile: stacked cards */}
          <div className="flex flex-col gap-3 sm:hidden">
            {logRows.map((p) => (
              <div key={p.weekNumber} className="bg-white border border-border rounded-xl p-4">
                <div className="flex items-center justify-between mb-2.5">
                  <span className="text-[13px] font-extrabold">Week {p.weekNumber}</span>
                  <span
                    className="text-[11px] font-extrabold px-2 py-0.5 rounded-full"
                    style={
                      p.madeUpDate
                        ? { background: "var(--color-status-ok-bg)", color: "var(--color-status-ok-fg)" }
                        : { background: "var(--color-status-flagged-bg)", color: "var(--color-status-flagged-fg)" }
                    }
                  >
                    {p.madeUpDate ? "Made up" : "Still outstanding"}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[12.5px] mb-2">
                  <div>
                    <div className="text-muted font-bold uppercase tracking-wide text-[10.5px]">Original due</div>
                    <div className="font-semibold mt-0.5">{formatDateShort(p.dueDate)}</div>
                  </div>
                  <div>
                    <div className="text-muted font-bold uppercase tracking-wide text-[10.5px]">Made up on</div>
                    <div className="font-semibold mt-0.5">
                      {p.madeUpDate ? formatDateShort(p.madeUpDate) : "—"}
                    </div>
                  </div>
                </div>
                {p.reason && (
                  <div className="text-[12.5px] text-muted font-semibold border-t border-hairline pt-2 mt-1">
                    {p.reason}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Tablet and up: table */}
          <div className="hidden sm:block bg-white border border-border rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <div className="min-w-[620px]">
                <div className="grid grid-cols-[70px_1fr_1fr_1fr_1.6fr] px-5 py-3 bg-[#faf0ef] text-[11.5px] font-extrabold text-[#a3271f] uppercase tracking-wide">
                  <div>Wk #</div>
                  <div>Original due</div>
                  <div>Status</div>
                  <div>Made up on</div>
                  <div>Note</div>
                </div>

                {logRows.map((p) => (
                  <div
                    key={p.weekNumber}
                    className="grid grid-cols-[70px_1fr_1fr_1fr_1.6fr] px-5 py-3 border-t border-hairline items-center text-sm"
                  >
                    <div className="font-bold">{p.weekNumber}</div>
                    <div className="font-semibold">{formatDateShort(p.dueDate)}</div>
                    <div>
                      <span
                        className="text-[11.5px] font-extrabold px-2.5 py-1 rounded-full"
                        style={
                          p.madeUpDate
                            ? { background: "var(--color-status-ok-bg)", color: "var(--color-status-ok-fg)" }
                            : { background: "var(--color-status-flagged-bg)", color: "var(--color-status-flagged-fg)" }
                        }
                      >
                        {p.madeUpDate ? "Made up" : "Still outstanding"}
                      </span>
                    </div>
                    <div className="font-semibold">
                      {p.madeUpDate ? formatDateShort(p.madeUpDate) : "Not yet paid"}
                    </div>
                    <div className="font-semibold text-muted">{p.reason || "—"}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
