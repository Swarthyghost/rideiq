"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatDateLong, formatGHS } from "@/lib/format";
import { getPaymentRowDisplay } from "@/lib/status";
import type { Payment } from "@/lib/types";

type ActionKind = "paid" | "undo";

const ACTION_ENDPOINT: Record<ActionKind, string> = {
  paid: "/api/payments/mark-paid",
  undo: "/api/payments/undo-missed",
};

export function PaymentScheduleTable({ bikeId, payments }: { bikeId: string; payments: Payment[] }) {
  const router = useRouter();
  const [pendingAction, setPendingAction] = useState<{ weekNumber: number; kind: ActionKind } | null>(null);
  const [reasonText, setReasonText] = useState("");
  const [submitting, setSubmitting] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function commitAction(weekNumber: number, kind: ActionKind, reason: string | null) {
    setSubmitting(weekNumber);
    setError(null);
    try {
      const response = await fetch(ACTION_ENDPOINT[kind], {
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

  function handleUndoClick(payment: Payment) {
    setError(null);
    setReasonText("");
    setPendingAction({ weekNumber: payment.weekNumber, kind: "undo" });
  }

  const rows = payments.map((payment) => {
    const isEarliest = payment.weekNumber === payments.find((p) => p.status === "pending" || p.status === "missed")?.weekNumber;
    const display = getPaymentRowDisplay(payment, isEarliest);
    const isPendingRow = pendingAction?.weekNumber === payment.weekNumber;
    // Weeks past due are flagged missed automatically by the daily sweep, so
    // undoing a wrongly-recorded strike is the only manual action left here.
    const canUndo = payment.missedDate !== null;
    return { payment, display, isPendingRow, canUndo };
  });

  return (
    <div className="mb-7">
      {/* Mobile: stacked cards */}
      <div className="flex flex-col gap-3 sm:hidden">
        {rows.map(({ payment, display, isPendingRow, canUndo }) => (
          <div key={payment.weekNumber} className="bg-white border border-border rounded-xl p-4">
            <div className="flex items-center justify-between gap-2 flex-wrap mb-2.5">
              <span className="text-[13.5px] font-extrabold">
                Week {payment.weekNumber} — {formatDateLong(payment.dueDate)}
              </span>
              <span className="flex items-center gap-1.5 flex-shrink-0">
                <span
                  className="text-xs font-extrabold px-2.5 py-1 rounded-full"
                  style={{ background: display.bg, color: display.fg }}
                >
                  {display.statusLabel}
                </span>
                {display.wasMissed && (
                  <span
                    className="text-xs font-extrabold px-2.5 py-1 rounded-full"
                    style={{ background: "var(--color-status-flagged-bg)", color: "var(--color-status-flagged-fg)" }}
                  >
                    Missed
                  </span>
                )}
              </span>
            </div>

            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="text-[13px] font-semibold text-muted">{formatGHS(payment.amountDue)}</div>
              {canUndo && !isPendingRow && (
                <button
                  onClick={() => handleUndoClick(payment)}
                  disabled={submitting === payment.weekNumber}
                  className="text-[12px] font-bold text-muted hover:text-ink underline cursor-pointer disabled:opacity-50"
                >
                  Undo strike
                </button>
              )}
            </div>

            {display.showMark && !isPendingRow && (
              <button
                onClick={() => handleMarkPaidClick(payment)}
                disabled={submitting === payment.weekNumber}
                className="w-full bg-[#1f6b45] hover:opacity-85 text-white rounded-[7px] px-3.5 py-2 font-bold text-[12.5px] cursor-pointer disabled:opacity-50"
              >
                {submitting === payment.weekNumber ? "Saving…" : "Mark paid"}
              </button>
            )}

            {isPendingRow && pendingAction && pendingAction.kind === "undo" && (
              <div className="flex flex-col gap-2 bg-bg border border-border rounded-lg px-3 py-2.5">
                <div className="text-[12.5px] font-semibold text-muted">
                  This removes the grace strike for week {payment.weekNumber}. The payment record itself
                  won&apos;t change.
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => commitAction(payment.weekNumber, "undo", null)}
                    disabled={submitting === payment.weekNumber}
                    className="flex-1 bg-[#1f6b45] text-white rounded-md px-3 py-1.5 font-bold text-[12.5px] cursor-pointer disabled:opacity-50"
                  >
                    {submitting === payment.weekNumber ? "Saving…" : "Confirm"}
                  </button>
                  <button
                    onClick={() => setPendingAction(null)}
                    className="text-muted font-bold text-[12.5px] cursor-pointer px-2"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {isPendingRow && pendingAction && pendingAction.kind === "paid" && (
              <div className="flex flex-col gap-2 bg-bg border border-border rounded-lg px-3 py-2.5">
                <input
                  autoFocus
                  type="text"
                  value={reasonText}
                  onChange={(e) => setReasonText(e.target.value)}
                  placeholder="Reason for the missed week (optional)"
                  className="w-full text-[13px] font-semibold bg-white border border-border-input rounded-md px-2.5 py-1.5 focus:outline-none focus:border-[#1f6b45]"
                />
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => commitAction(payment.weekNumber, "paid", reasonText.trim() || null)}
                    disabled={submitting === payment.weekNumber}
                    className="flex-1 bg-[#1f6b45] text-white rounded-md px-3 py-1.5 font-bold text-[12.5px] cursor-pointer disabled:opacity-50"
                  >
                    Confirm
                  </button>
                  <button
                    onClick={() => setPendingAction(null)}
                    className="text-muted font-bold text-[12.5px] cursor-pointer px-2"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Tablet and up: table */}
      <div className="hidden sm:block bg-white border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <div className="min-w-[640px]">
            <div className="grid grid-cols-[60px_1.2fr_1fr_1fr_230px] px-5 py-3 bg-panel text-[11.5px] font-extrabold text-muted uppercase tracking-wide">
              <div>Wk</div>
              <div>Due date</div>
              <div>Amount</div>
              <div>Status</div>
              <div></div>
            </div>

            {rows.map(({ payment, display, isPendingRow, canUndo }) => (
              <div
                key={payment.weekNumber}
                className="grid grid-cols-[60px_1.2fr_1fr_1fr_230px] px-5 py-3 border-t border-hairline items-center text-sm hover:bg-bg"
              >
                <div className="font-bold text-muted">{payment.weekNumber}</div>
                <div className="font-semibold">{formatDateLong(payment.dueDate)}</div>
                <div className="font-semibold">{formatGHS(payment.amountDue)}</div>
                <div className="flex items-center gap-1.5">
                  <span
                    className="text-xs font-extrabold px-2.5 py-1 rounded-full"
                    style={{ background: display.bg, color: display.fg }}
                  >
                    {display.statusLabel}
                  </span>
                  {display.wasMissed && (
                    <span
                      className="text-xs font-extrabold px-2.5 py-1 rounded-full"
                      style={{ background: "var(--color-status-flagged-bg)", color: "var(--color-status-flagged-fg)" }}
                    >
                      Missed
                    </span>
                  )}
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
                  {canUndo && !isPendingRow && (
                    <button
                      onClick={() => handleUndoClick(payment)}
                      disabled={submitting === payment.weekNumber}
                      className="text-[12px] font-bold text-muted hover:text-ink underline cursor-pointer disabled:opacity-50"
                    >
                      Undo strike
                    </button>
                  )}
                </div>

                {isPendingRow && pendingAction && pendingAction.kind === "undo" && (
                  <div className="col-span-5 mt-2.5 -mb-1 flex items-center gap-2 bg-bg border border-border rounded-lg px-3 py-2.5">
                    <div className="flex-1 text-[12.5px] font-semibold text-muted">
                      This removes the grace strike for week {payment.weekNumber}. The payment record
                      itself won&apos;t change.
                    </div>
                    <button
                      onClick={() => commitAction(payment.weekNumber, "undo", null)}
                      disabled={submitting === payment.weekNumber}
                      className="bg-[#1f6b45] text-white rounded-md px-3 py-1.5 font-bold text-[12.5px] cursor-pointer disabled:opacity-50"
                    >
                      {submitting === payment.weekNumber ? "Saving…" : "Confirm"}
                    </button>
                    <button
                      onClick={() => setPendingAction(null)}
                      className="text-muted font-bold text-[12.5px] cursor-pointer px-1"
                    >
                      Cancel
                    </button>
                  </div>
                )}

                {isPendingRow && pendingAction && pendingAction.kind === "paid" && (
                  <div className="col-span-5 mt-2.5 -mb-1 flex items-center gap-2 bg-bg border border-border rounded-lg px-3 py-2.5">
                    <input
                      autoFocus
                      type="text"
                      value={reasonText}
                      onChange={(e) => setReasonText(e.target.value)}
                      placeholder="Reason for the missed week (optional)"
                      className="flex-1 text-[13px] font-semibold bg-white border border-border-input rounded-md px-2.5 py-1.5 focus:outline-none focus:border-[#1f6b45]"
                    />
                    <button
                      onClick={() => commitAction(payment.weekNumber, "paid", reasonText.trim() || null)}
                      disabled={submitting === payment.weekNumber}
                      className="bg-[#1f6b45] text-white rounded-md px-3 py-1.5 font-bold text-[12.5px] cursor-pointer disabled:opacity-50"
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
            ))}
          </div>
        </div>
      </div>

      {error && (
        <div className="mt-3 px-5 py-3 border border-border rounded-lg text-[13px] font-semibold text-[#a3271f] bg-status-flagged-bg">
          {error}
        </div>
      )}
    </div>
  );
}
