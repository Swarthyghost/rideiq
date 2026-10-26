import { formatDateShort, formatGHS } from "@/lib/format";
import {
  STATEMENT_STATUS_TEXT,
  type StatementData,
  type StatementRowStatus,
} from "@/lib/statement-data";

const STATUS_STYLE: Record<StatementRowStatus, { bg: string; fg: string }> = {
  paid: { bg: "var(--color-status-ok-bg)", fg: "var(--color-status-ok-fg)" },
  "paid-late": { bg: "var(--color-status-ok-bg)", fg: "var(--color-status-ok-fg)" },
  awaiting: { bg: "#e6eefa", fg: "#1f4f8f" },
  overdue: { bg: "var(--color-status-flagged-bg)", fg: "var(--color-status-flagged-fg)" },
  due: { bg: "var(--color-status-grace-bg)", fg: "var(--color-status-grace-fg)" },
};

function Tile({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="bg-panel rounded-xl px-3.5 py-3 min-w-0">
      <div className="text-[11.5px] font-semibold text-muted">{label}</div>
      <div className="text-[17px] font-extrabold mt-0.5 break-words" style={color ? { color } : undefined}>
        {value}
      </div>
    </div>
  );
}

/** The on-screen statement. It stacks and wraps instead of using a wide table, so it fits any phone. */
export function RiderStatementView({ data }: { data: StatementData }) {
  return (
    <div className="flex flex-col gap-4 min-w-0">
      <div className="min-w-0">
        <div className="text-[19px] font-extrabold leading-tight break-words">{data.riderName}</div>
        <div className="text-[13px] font-semibold text-muted mt-1 break-words">
          {data.bikeModel}
          {data.plateNumber ? ` · ${data.plateNumber}` : ""}
        </div>
        <div className="text-[12.5px] font-semibold text-muted mt-0.5">
          Statement date: {formatDateShort(data.statementDate)}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        <Tile label="Contract total" value={formatGHS(data.totalValue)} />
        <Tile label="Paid so far" value={formatGHS(data.paidAmount)} color="var(--color-status-ok-fg)" />
        <Tile label="Balance left" value={data.balance === null ? "Void" : formatGHS(data.balance)} />
        <Tile label="Payments made" value={`${data.paidCount} of ${data.numPayments}`} />
      </div>

      <div
        className="text-[13px] font-bold"
        style={{ color: data.lateUsed > 0 ? "var(--color-status-flagged-fg)" : "var(--color-status-ok-fg)" }}
      >
        Late payments used: {data.lateUsed} of {data.lateAllowed}
      </div>

      {data.awaitingAmount > 0 && (
        <div className="text-[13px] font-semibold rounded-xl px-3.5 py-2.5" style={{ background: "#e6eefa", color: "#1f4f8f" }}>
          Awaiting the owner&apos;s confirmation: {formatGHS(data.awaitingAmount)}. It is not counted as paid until
          confirmed.
        </div>
      )}

      {data.repossessed && (
        <div className="text-[13px] font-bold rounded-xl bg-panel px-3.5 py-2.5">
          Bike repossessed. This account is closed and the remaining balance is void.
        </div>
      )}

      <div>
        <div className="text-[15px] font-extrabold mb-2">Week by week</div>
        {data.rows.length === 0 ? (
          <div className="text-[13.5px] font-semibold text-muted bg-panel rounded-xl px-3.5 py-3">
            {data.repossessed ? "No payments were made on this account." : "No payments have fallen due yet."}
          </div>
        ) : (
          <div className="border border-border rounded-xl overflow-hidden">
            {data.rows.map((row) => {
              const style = STATUS_STYLE[row.status];
              return (
                <div key={row.weekNumber} className="px-3.5 py-3 border-b border-hairline last:border-b-0">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-[14px] font-extrabold">Week {row.weekNumber}</div>
                      <div className="text-[12.5px] font-semibold text-muted">
                        Due {formatDateShort(row.dueDate)}
                      </div>
                    </div>
                    <div className="text-[14px] font-extrabold flex-shrink-0">{formatGHS(row.amountDue)}</div>
                  </div>
                  <div className="flex items-center justify-between gap-2 flex-wrap mt-2">
                    <span
                      className="text-[11.5px] font-extrabold px-2.5 py-1 rounded-full"
                      style={{ background: style.bg, color: style.fg }}
                    >
                      {STATEMENT_STATUS_TEXT[row.status]}
                    </span>
                    {row.paidDate && (
                      <span className="text-[12px] font-semibold text-muted">
                        Paid on {formatDateShort(row.paidDate)}
                      </span>
                    )}
                  </div>
                  {row.paidToDate !== null && (
                    <div className="text-[12px] font-semibold text-muted mt-1.5">
                      Total paid so far:{" "}
                      <span className="font-extrabold text-ink">{formatGHS(row.paidToDate)}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between gap-3 bg-panel rounded-xl px-3.5 py-3">
        <div className="text-[14px] font-extrabold">Total paid to date</div>
        <div className="text-[16px] font-extrabold" style={{ color: "var(--color-status-ok-fg)" }}>
          {formatGHS(data.paidAmount)}
        </div>
      </div>

      <div className="text-[12px] font-semibold text-muted leading-relaxed">
        {data.upcomingCount > 0 && (
          <div>
            {data.upcomingCount} later payment{data.upcomingCount === 1 ? "" : "s"} (
            {formatGHS(data.upcomingAmount)} in total) not yet due and not shown.
          </div>
        )}
        <div>
          This statement lists payments confirmed by the owner. A payment you reported is shown as Awaiting
          confirmation.
        </div>
      </div>
    </div>
  );
}
