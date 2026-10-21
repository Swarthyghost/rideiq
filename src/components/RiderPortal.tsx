"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Avatar } from "@/components/Avatar";
import { formatDateLong, formatDateShort, formatGHS } from "@/lib/format";
import { PAYMENT_DETAILS, RIDER_SUPPORT_WHATSAPP_DISPLAY, RIDER_SUPPORT_WHATSAPP_LINK } from "@/lib/rider-portal";
import type { RiderPaymentRow, RiderRowState, RiderView } from "@/lib/rider-view";

const STATE_STYLE: Record<RiderRowState, { label: string; bg: string; fg: string }> = {
  paid: { label: "Paid", bg: "var(--color-status-ok-bg)", fg: "var(--color-status-ok-fg)" },
  awaiting: { label: "Waiting for owner", bg: "#e6eefa", fg: "#1f4f8f" },
  missed: { label: "Late", bg: "var(--color-status-flagged-bg)", fg: "var(--color-status-flagged-fg)" },
  due: { label: "Due now", bg: "var(--color-status-grace-bg)", fg: "var(--color-status-grace-fg)" },
  upcoming: { label: "Coming up", bg: "#f0ede4", fg: "#8a8474" },
};

export function RiderPortal({ token, view }: { token: string; view: RiderView }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState<number | null>(null);
  const [busy, setBusy] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const attention = view.payments.filter((p) => p.canReport || p.canWithdraw);
  const percent = Math.min(100, Math.round((view.paidCount / Math.max(view.numPayments, 1)) * 100));
  const used = Math.min(view.missedCount, view.graceAllowance);
  const left = view.graceAllowance - used;

  async function copyNumber() {
    try {
      await navigator.clipboard.writeText(PAYMENT_DETAILS.number);
    } catch {
      // Older browsers: fall back to selecting a hidden input.
      const input = document.createElement("input");
      input.value = PAYMENT_DETAILS.number;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      document.body.removeChild(input);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  async function send(weekNumber: number, action: "report" | "cancel") {
    setBusy(weekNumber);
    setError(null);
    try {
      const response = await fetch(`/api/rider/${token}/report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ weekNumber, action }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Something went wrong.");
      setConfirming(null);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(null);
    }
  }

  function renderAction(row: RiderPaymentRow) {
    const style = STATE_STYLE[row.state];
    return (
      <div key={row.weekNumber} className="border border-border rounded-xl p-4 bg-white">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-[14px] font-extrabold">Week {row.weekNumber}</div>
            <div className="text-[12.5px] font-semibold text-muted mt-0.5">
              Due {formatDateLong(row.dueDate)} · {formatGHS(row.amountDue)}
            </div>
          </div>
          <span
            className="text-xs font-extrabold px-2.5 py-1 rounded-full flex-shrink-0"
            style={{ background: style.bg, color: style.fg }}
          >
            {style.label}
          </span>
        </div>

        {row.canWithdraw ? (
          <div className="mt-3">
            <div className="text-[13px] font-semibold text-[#1f4f8f]">
              Sent. The owner will confirm once they have received your money.
            </div>
            <button
              onClick={() => send(row.weekNumber, "cancel")}
              disabled={busy === row.weekNumber}
              className="mt-2 text-[12.5px] font-bold text-muted underline cursor-pointer disabled:opacity-50"
            >
              {busy === row.weekNumber ? "Please wait…" : "I sent this by mistake"}
            </button>
          </div>
        ) : confirming === row.weekNumber ? (
          <div className="mt-3 bg-bg border border-border rounded-lg px-3 py-3">
            <div className="text-[13px] font-semibold">
              Only tap yes after you have sent {formatGHS(row.amountDue)} to the owner.
            </div>
            <div className="flex items-center gap-2 mt-2.5">
              <button
                onClick={() => send(row.weekNumber, "report")}
                disabled={busy === row.weekNumber}
                className="flex-1 bg-[#1f6b45] text-white rounded-md px-3 py-2 font-bold text-[13px] cursor-pointer disabled:opacity-50"
              >
                {busy === row.weekNumber ? "Sending…" : "Yes, I have paid"}
              </button>
              <button
                onClick={() => setConfirming(null)}
                className="text-muted font-bold text-[13px] cursor-pointer px-2"
              >
                Not yet
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => {
              setError(null);
              setConfirming(row.weekNumber);
            }}
            className="mt-3 w-full bg-brand text-cream font-extrabold text-[14px] rounded-[9px] py-2.5 hover:opacity-90 cursor-pointer"
          >
            I&apos;ve paid
          </button>
        )}
      </div>
    );
  }

  return (
    <div className={`flex-1 flex flex-col ${view.repossessed ? "grayscale" : ""}`}>
      <nav className="bg-brand px-4 sm:px-10 py-4">
        <div className="max-w-[640px] mx-auto text-cream font-extrabold text-[17px]">RiderIQ · My payments</div>
      </nav>

      <div className="px-4 py-6 pb-24 max-w-[640px] w-full mx-auto flex flex-col gap-5">
        {view.repossessed && (
          <div className="rounded-xl border border-border bg-panel px-4 py-3 text-[13.5px] font-bold">
            Your bike has been taken back and this account is closed. Please contact the owner on WhatsApp.
          </div>
        )}
        <div className="flex items-center gap-4">
          {view.hasPhoto ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={`/api/rider/${token}/photo`}
              alt={view.riderName}
              width={64}
              height={64}
              className="w-16 h-16 rounded-full object-cover flex-shrink-0"
            />
          ) : (
            <Avatar name={view.riderName} size={64} />
          )}
          <div className="min-w-0">
            <div className="text-[21px] font-extrabold leading-tight">{view.riderName}</div>
            <div className="text-[13.5px] font-semibold text-muted mt-1">
              {view.bikeModel}
              {view.plateNumber ? ` · ${view.plateNumber}` : ""}
            </div>
            <div className="text-[13px] font-semibold text-muted">{view.riderPhone}</div>
          </div>
        </div>

        <div className="bg-white border border-border rounded-2xl p-5">
          <div className="flex items-baseline justify-between">
            <div className="text-[13px] font-bold text-muted">Your progress</div>
            <div className="text-[13px] font-extrabold">
              {view.paidCount} of {view.numPayments} payments
            </div>
          </div>
          <div className="mt-2.5 h-2.5 rounded-full bg-panel overflow-hidden">
            <div className="h-full rounded-full bg-[#1f6b45]" style={{ width: `${percent}%` }} />
          </div>
          <div className="grid grid-cols-2 gap-4 mt-4">
            <div>
              <div className="text-[12px] font-semibold text-muted">Paid so far</div>
              <div className="text-[19px] font-extrabold text-[#1f6b45]">{formatGHS(view.paidAmount)}</div>
            </div>
            <div>
              <div className="text-[12px] font-semibold text-muted">Still to pay</div>
              <div className="text-[19px] font-extrabold">{formatGHS(view.leftAmount)}</div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-hairline text-[13px] font-semibold">
            <div>
              <div className="text-[12px] text-muted">Each week</div>
              {formatGHS(view.weeklyAmount)}
            </div>
            <div>
              <div className="text-[12px] text-muted">Started</div>
              {formatDateLong(view.startDate)}
            </div>
          </div>
        </div>

        <div
          className="rounded-2xl border p-5"
          style={{
            background: view.flagged ? "var(--color-status-flagged-bg)" : "var(--color-panel)",
            borderColor: view.flagged ? "#f0c9c5" : "var(--color-border)",
          }}
        >
          <div className="text-[13px] font-bold text-muted">Late payments</div>
          <div className="flex items-center gap-2 mt-2">
            {Array.from({ length: view.graceAllowance }, (_, i) => (
              <span
                key={i}
                className="w-3.5 h-3.5 rounded-full"
                style={{ background: i < used ? "#a3271f" : "#d8d3c4" }}
              />
            ))}
            <span className="text-[14px] font-extrabold ml-1">
              {used} of {view.graceAllowance} used
            </span>
          </div>
          <div className="text-[12.5px] font-semibold mt-2.5" style={{ color: view.flagged ? "#a3271f" : "#3a3630" }}>
            {view.flagged
              ? "You have used all your late payments. Please contact the owner now."
              : left === 1
                ? "Be careful: one more late payment and the bike will be taken back."
                : used === 0
                  ? "No late payments. Keep it up."
                  : `You can be late ${left} more times. A payment is late if it is not paid on its due day.`}
          </div>
        </div>

        {!view.repossessed && (
          <>
        <div className="bg-white border border-border rounded-2xl p-5">
          <div className="text-[13px] font-bold text-muted mb-3">How to pay</div>
          <div className="text-[12px] font-semibold text-muted">Account name</div>
          <div className="text-[15px] font-extrabold">{PAYMENT_DETAILS.accountName}</div>
          <div className="flex items-center justify-between gap-3 mt-3">
            <div>
              <div className="text-[12px] font-semibold text-muted">{PAYMENT_DETAILS.network} MoMo Number</div>
              <div className="text-[22px] font-extrabold tracking-wide">{PAYMENT_DETAILS.number}</div>
            </div>
            <button
              onClick={copyNumber}
              className="bg-brand text-cream font-bold text-[13.5px] rounded-lg px-4 py-2.5 hover:opacity-90 cursor-pointer flex-shrink-0 min-w-[84px]"
            >
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
          <div className="text-[12.5px] font-semibold text-muted mt-3">
            Send your payment, then tap &quot;I&apos;ve paid&quot; below.
          </div>
        </div>

        <div>
          <div className="text-[15px] font-extrabold mb-3">Your payments to report</div>
          {attention.length === 0 ? (
            <div className="bg-white border border-border rounded-xl px-5 py-5 text-[14px] font-semibold text-muted">
              {view.status === "completed" || view.paidCount >= view.numPayments
                ? "All your payments are done. Well done!"
                : "You are all up to date. Nothing to report right now."}
            </div>
          ) : (
            <div className="flex flex-col gap-3">{attention.map(renderAction)}</div>
          )}
          {error && (
            <div className="mt-3 text-[13px] font-semibold text-[#a3271f] bg-status-flagged-bg rounded-lg px-3 py-2">
              {error}
            </div>
          )}
        </div>

          </>
        )}

        <details className="bg-white border border-border rounded-2xl">
          <summary className="px-5 py-4 text-[14.5px] font-extrabold cursor-pointer">All my payments</summary>
          <div className="border-t border-hairline">
            {view.payments.map((p) => {
              const style = STATE_STYLE[p.state];
              return (
                <div
                  key={p.weekNumber}
                  className="flex items-center justify-between gap-3 px-5 py-3 border-b border-hairline last:border-b-0"
                >
                  <div className="text-[13.5px] font-semibold">
                    <span className="font-extrabold">Week {p.weekNumber}</span> · {formatDateShort(p.dueDate)} ·{" "}
                    {formatGHS(p.amountDue)}
                  </div>
                  <span
                    className="text-[11.5px] font-extrabold px-2.5 py-1 rounded-full flex-shrink-0"
                    style={{ background: style.bg, color: style.fg }}
                  >
                    {style.label}
                  </span>
                </div>
              );
            })}
          </div>
        </details>

        {view.missedLog.length > 0 && (
          <div className="bg-white border border-border rounded-2xl p-5">
            <div className="text-[15px] font-extrabold mb-3">Late payment record</div>
            <div className="flex flex-col gap-3">
              {view.missedLog.map((m) => (
                <div key={m.weekNumber} className="text-[13px] font-semibold">
                  <span className="font-extrabold">Week {m.weekNumber}</span> was due {formatDateShort(m.dueDate)}
                  {m.madeUpDate ? `, paid ${formatDateShort(m.madeUpDate)}` : ", not yet paid"}
                  {m.note ? <div className="text-muted mt-0.5">{m.note}</div> : null}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="text-center text-[13px] font-semibold text-muted">
          Questions? WhatsApp RideIQ on{" "}
          <a href={RIDER_SUPPORT_WHATSAPP_LINK} className="text-[#1f6b45] font-extrabold underline">
            {RIDER_SUPPORT_WHATSAPP_DISPLAY}
          </a>
          , or tap the Prince button to ask.
        </div>
      </div>
    </div>
  );
}
