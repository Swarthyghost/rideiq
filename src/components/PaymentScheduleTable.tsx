"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatDateLong, formatGHS } from "@/lib/format";
import { getPaymentRowDisplay } from "@/lib/status";
import type { Payment } from "@/lib/types";

type ActionKind = "paid" | "missed";

export function PaymentScheduleTable({ bikeId, payments }: { bikeId: string; payments: Payment[] }) {
  const router = useRouter();
  const [pendingAction, setPendingAction] = useState<{ weekNumber: number; kind: ActionKind } | null>(null);
  const [reasonText, setReasonText] = useState("");
  const [submitting, setSubmitting] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const earliestOutstandingWeek = payments.find(
    (p) => p.status === "pending" || p.status === "missed"
  )?.weekNumber;

  async function commitAction(weekNumber: number, kind: ActionKind, reason: string | null) {
    setSubmitting(weekNumber);
    setError(null);
    try {
      const response = await fetch(`/api/payments/mark-${kind}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bikeId, weekNumber, reason }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Failed");
      setPendingAction(null);
      setReasonText("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Try again.");
    } finally {
      setSubmitting(null);
    }
  }

  function handleMarkPaidClick(payment: Payment) {
    const overdue = payment.status === "missed";
    if (overdue) {
      setError(null);
      setReasonText("");
      setPendingAction({ weekNumber: payment.weekNumber, kind: "paid" });
    } else {
      commitAction(payment.weekNumber, "paid", null);
    }
  }

  function handleMarkMissedClick(payment: Payment) {
    setError(null);
    setReasonText("");
    setPendingAction({ weekNumber: payment.weekNumber, kind: "missed" });
  }

  return (
    <div className="bg-white border border-border rounded-xl overflow-hidden mb-7">
      <div className="overflow-x-auto">
        <div className="min-w-[640px]">
          <div className="grid grid-cols-[60px_1.2fr_1fr_1fr_230px] px-5 py-3 bg-panel text-[11.5px] font-extrabold text-muted uppercase tracking-wide">
            <div>Wk</div>
            <div>Due date</div>
            <div>Amount</div>
            <div>Status</div>
            <div></div>
          </div>

          {payments.map((payment) => {
            const isEarliest = payment.weekNumber === earliestOutstandingWeek;
            const display = getPaymentRowDisplay(payment, isEarliest);
            const isPendingRow = pendingAction?.weekNumber === payment.weekNumber;
            // "Mark missed" is only offered on the current due row, before it's
            // actually overdue -- once it's already missed there's nothing left to mark.
            const canMarkMissed = isEarliest && display.statusLabel === "Due now";

            return (
              <div
                key={payment.weekNumber}
                className="grid grid-cols-[60px_1.2fr_1fr_1fr_230px] px-5 py-3 border-t border-hairline items-center text-sm hover:bg-bg"
              >
                <div className="font-bold text-muted">{payment.weekNumber}</div>
                <div className="font-semibold">{formatDateLong(payment.dueDate)}</div>
                <div className="font-semibold">{formatGHS(payment.amountDue)}</div>
                <div>
                  <span
                    className="text-xs font-extrabold px-2.5 py-1 rounded-full"
                    style={{ background: display.bg, color: display.fg }}
                  >
                    {display.statusLabel}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {display.showMark && !isPendingRow && (
                    <button
                      onClick={() => handleMarkPaidClick(payment)}
                      disabled={submitting === payment.weekNumber}
                      className="bg-[#1f6b45] hover:opacity-85 text-white rounded-[7px] px-3.5 py-1.5 font-bold text-[12.5px] cursor-pointer disabled:opacity-50"
                    >
                      {submitting === payment.weekNumber ? "Saving…" : "Mark paid"}
                    </button>
                  )}
                  {canMarkMissed && !isPendingRow && (
                    <button
                      onClick={() => handleMarkMissedClick(payment)}
                      disabled={submitting === payment.weekNumber}
                      className="bg-white border border-[#e0b4af] hover:bg-status-flagged-bg text-[#a3271f] rounded-[7px] px-3.5 py-1.5 font-bold text-[12.5px] cursor-pointer disabled:opacity-50"
                    >
                      Mark missed
                    </button>
                  )}
                </div>

                {isPendingRow && (
                  <div className="col-span-5 mt-2.5 -mb-1 flex items-center gap-2 bg-bg border border-border rounded-lg px-3 py-2.5">
                    <input
                      autoFocus
                      type="text"
                      value={reasonText}
                      onChange={(e) => setReasonText(e.target.value)}
                      placeholder={
                        pendingAction.kind === "missed"
                          ? "Reason this week was missed (optional)"
                          : "Reason for the missed week (optional)"
                      }
                      className="flex-1 text-[13px] font-semibold bg-white border border-border-input rounded-md px-2.5 py-1.5 focus:outline-none focus:border-[#1f6b45]"
                    />
                    <button
                      onClick={() => commitAction(payment.weekNumber, pendingAction.kind, reasonText.trim() || null)}
                      disabled={submitting === payment.weekNumber}
                      className={
                        pendingAction.kind === "missed"
                          ? "bg-[#a3271f] text-white rounded-md px-3 py-1.5 font-bold text-[12.5px] cursor-pointer disabled:opacity-50"
                          : "bg-[#1f6b45] text-white rounded-md px-3 py-1.5 font-bold text-[12.5px] cursor-pointer disabled:opacity-50"
                      }
                    >
                      Confirm
                    </button>
                    <button
                      onClick={() => setPendingAction(null)}
                      className="text-muted font-bold text-[12.5px] cursor-pointer px-1"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {error && (
        <div className="px-5 py-3 border-t border-hairline text-[13px] font-semibold text-[#a3271f] bg-status-flagged-bg">
          {error}
        </div>
      )}
    </div>
  );
}
