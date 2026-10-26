import { toISODate } from "@/lib/format";
import type { RiderView } from "@/lib/rider-view";

export type StatementRowStatus = "paid" | "paid-late" | "awaiting" | "overdue" | "due";

export interface StatementRow {
  weekNumber: number;
  dueDate: string;
  amountDue: number;
  status: StatementRowStatus;
  paidDate: string | null;
  /** Running total paid up to and including this week; only set on paid weeks. */
  paidToDate: number | null;
}

/** Everything a statement shows, built once so the on-screen view and the PDF can never disagree. */
export interface StatementData {
  riderName: string;
  bikeModel: string;
  plateNumber: string | null;
  startDate: string;
  weeklyAmount: number;
  totalValue: number;
  numPayments: number;
  paidCount: number;
  paidAmount: number;
  /** Null when the bike was repossessed, because the remaining balance is void. */
  balance: number | null;
  repossessed: boolean;
  lateUsed: number;
  lateAllowed: number;
  awaitingAmount: number;
  rows: StatementRow[];
  upcomingCount: number;
  upcomingAmount: number;
  /** ISO date the statement was made. */
  statementDate: string;
}

export const STATEMENT_STATUS_TEXT: Record<StatementRowStatus, string> = {
  paid: "Paid",
  "paid-late": "Paid (was late)",
  awaiting: "Awaiting confirmation",
  overdue: "Overdue (unpaid)",
  due: "Due now",
};

export function buildStatementData(view: RiderView, now: Date): StatementData {
  const repossessed = view.repossessed;

  // A repossessed account is closed, so only weeks that were actually paid (or reported) are
  // listed; the weeks it still owed are void and would only be misleading as "overdue".
  const listed = view.payments.filter((p) =>
    repossessed ? p.state === "paid" || p.state === "awaiting" : p.state !== "upcoming"
  );

  let running = 0;
  const rows: StatementRow[] = listed.map((p) => {
    if (p.state === "paid") running += p.amountDue;
    const status: StatementRowStatus =
      p.state === "paid" ? (p.wasLate ? "paid-late" : "paid") : p.state === "awaiting" ? "awaiting" : p.state === "missed" ? "overdue" : "due";
    return {
      weekNumber: p.weekNumber,
      dueDate: p.dueDate,
      amountDue: p.amountDue,
      status,
      paidDate: p.paidDate,
      paidToDate: p.state === "paid" ? running : null,
    };
  });

  const upcoming = repossessed ? [] : view.payments.filter((p) => p.state === "upcoming");

  return {
    riderName: view.riderName,
    bikeModel: view.bikeModel,
    plateNumber: view.plateNumber,
    startDate: view.startDate,
    weeklyAmount: view.weeklyAmount,
    totalValue: view.totalValue,
    numPayments: view.numPayments,
    paidCount: view.paidCount,
    paidAmount: view.paidAmount,
    balance: repossessed ? null : view.leftAmount,
    repossessed,
    lateUsed: Math.min(view.missedCount, view.graceAllowance),
    lateAllowed: view.graceAllowance,
    awaitingAmount: view.payments.filter((p) => p.state === "awaiting").reduce((s, p) => s + p.amountDue, 0),
    rows,
    upcomingCount: upcoming.length,
    upcomingAmount: upcoming.reduce((s, p) => s + p.amountDue, 0),
    statementDate: toISODate(now),
  };
}

export function statementFileName(data: StatementData): string {
  const slug =
    data.riderName
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^A-Za-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "rider";
  return `RiderIQ-statement-${slug}-${data.statementDate}.pdf`;
}
