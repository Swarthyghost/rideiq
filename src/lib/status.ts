import { formatDateLong } from "@/lib/format";
import { isPastDue } from "@/lib/payments";
import type { BikeStatus, Payment } from "@/lib/types";

export interface StatusDisplay {
  label: string;
  bg: string;
  fg: string;
  barColor: string;
}

export function getStatusDisplay(
  liveStatus: BikeStatus,
  missedCount: number,
  graceAllowance: number
): StatusDisplay {
  if (liveStatus === "repossession_flagged") {
    return {
      label: "Repossession flagged",
      bg: "var(--color-status-flagged-bg)",
      fg: "var(--color-status-flagged-fg)",
      barColor: "#b91c1c",
    };
  }
  if (liveStatus === "repossessed") {
    return {
      label: "Repossessed",
      bg: "var(--color-status-flagged-bg)",
      fg: "var(--color-status-flagged-fg)",
      barColor: "#b91c1c",
    };
  }
  if (liveStatus === "completed") {
    return {
      label: "Completed",
      bg: "var(--color-status-ok-bg)",
      fg: "var(--color-status-ok-fg)",
      barColor: "#1f6b45",
    };
  }
  if (missedCount > 0) {
    return {
      label: `Grace ${missedCount} of ${graceAllowance} used`,
      bg: "var(--color-status-grace-bg)",
      fg: "var(--color-status-grace-fg)",
      barColor: "#b45309",
    };
  }
  return {
    label: "On track",
    bg: "var(--color-status-ok-bg)",
    fg: "var(--color-status-ok-fg)",
    barColor: "#1f6b45",
  };
}

function ordinal(n: number): string {
  const rem100 = n % 100;
  if (rem100 >= 11 && rem100 <= 13) return `${n}th`;
  switch (n % 10) {
    case 1: return `${n}st`;
    case 2: return `${n}nd`;
    case 3: return `${n}rd`;
    default: return `${n}th`;
  }
}

export interface NextPaymentInfo {
  label: string;
  color: string;
}

export function getNextPaymentInfo(
  payments: Payment[],
  liveStatus: BikeStatus,
  missedCount: number
): NextPaymentInfo {
  if (liveStatus === "repossession_flagged") {
    return { label: `${ordinal(missedCount)} missed payment`, color: "var(--color-status-flagged-fg)" };
  }
  if (liveStatus === "repossessed" || liveStatus === "completed") {
    return { label: liveStatus === "completed" ? "Schedule complete" : "Bike repossessed", color: "var(--color-muted)" };
  }

  const outstanding = payments
    .filter((p) => p.status === "pending" || p.status === "missed")
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));

  const next = outstanding[0];
  if (!next) return { label: "Schedule complete", color: "var(--color-muted)" };

  const asOf = new Date();
  if (next.status === "missed" || isPastDue(next.dueDate, asOf)) {
    return { label: `Overdue since ${formatDateLong(next.dueDate)}`, color: "var(--color-status-grace-fg)" };
  }
  return { label: `Due ${formatDateLong(next.dueDate)}`, color: "#3a3630" };
}

export interface PaymentRowDisplay {
  statusLabel: string;
  bg: string;
  fg: string;
  showMark: boolean;
  /** Paid, but only after being flagged missed -- the missed marker stays on the row. */
  wasMissed: boolean;
}

export function getPaymentRowDisplay(
  payment: Payment,
  isEarliestOutstanding: boolean
): PaymentRowDisplay {
  if (payment.status === "paid") {
    return { statusLabel: "Paid", bg: "var(--color-status-ok-bg)", fg: "var(--color-status-ok-fg)", showMark: false, wasMissed: payment.missedDate !== null };
  }

  const overdue = payment.status === "missed" || isPastDue(payment.dueDate, new Date());
  if (overdue) {
    return { statusLabel: "Missed", bg: "var(--color-status-flagged-bg)", fg: "var(--color-status-flagged-fg)", showMark: true, wasMissed: false };
  }

  if (isEarliestOutstanding) {
    return { statusLabel: "Due now", bg: "var(--color-status-grace-bg)", fg: "var(--color-status-grace-fg)", showMark: true, wasMissed: false };
  }

  return { statusLabel: "Upcoming", bg: "#f0ede4", fg: "#8a8474", showMark: false, wasMissed: false };
}
