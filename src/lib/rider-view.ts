import "server-only";
import {
  collectedTotal,
  computeGraceStatus,
  computeLiveMissedCount,
  computeLiveStatus,
  isPastDue,
  outstandingTotal,
  paidCount,
} from "@/lib/payments";
import type { BikeStatus, BikeWithPayments } from "@/lib/types";

export type RiderRowState = "paid" | "awaiting" | "missed" | "due" | "upcoming";

export interface RiderPaymentRow {
  weekNumber: number;
  dueDate: string;
  amountDue: number;
  state: RiderRowState;
  /** ISO date the owner confirmed the payment; null until then. */
  paidDate: string | null;
  /** True when this week carried a late-payment strike, even if it has since been paid. */
  wasLate: boolean;
  canReport: boolean;
  canWithdraw: boolean;
}

export interface RiderMissedEntry {
  weekNumber: number;
  dueDate: string;
  madeUpDate: string | null;
  note: string | null;
}

/**
 * Everything a rider's page is allowed to know -- built field by field so owner-only
 * data (capital, ROI, documents, other riders, internal ids) can never leak by accident.
 */
export interface RiderView {
  riderName: string;
  riderPhone: string;
  bikeModel: string;
  plateNumber: string | null;
  hasPhoto: boolean;
  startDate: string;
  weeklyAmount: number;
  totalValue: number;
  numPayments: number;
  paidCount: number;
  paidAmount: number;
  leftAmount: number;
  missedCount: number;
  graceAllowance: number;
  flagged: boolean;
  status: BikeStatus;
  repossessed: boolean;
  payments: RiderPaymentRow[];
  missedLog: RiderMissedEntry[];
}

export function buildRiderView(bike: BikeWithPayments): RiderView {
  const asOf = new Date();
  const missedCount = computeLiveMissedCount(bike.payments, asOf);
  const status = computeLiveStatus(bike, bike.payments, asOf);
  const grace = computeGraceStatus(missedCount, bike.graceAllowance);
  // The week due now is the first unpaid one, whether or not it has already been reported.
  const currentWeek = bike.payments.find((p) => p.status !== "paid")?.weekNumber;

  const payments = bike.payments.map((p): RiderPaymentRow => {
    const overdue = p.status === "missed" || isPastDue(p.dueDate, asOf);
    const reported = p.reportedPaidDate !== null;
    let state: RiderRowState = "upcoming";
    if (p.status === "paid") state = "paid";
    else if (reported) state = "awaiting";
    else if (overdue) state = "missed";
    else if (p.weekNumber === currentWeek) state = "due";

    const open = p.status !== "paid";
    return {
      weekNumber: p.weekNumber,
      dueDate: p.dueDate,
      amountDue: p.amountDue,
      state,
      paidDate: p.status === "paid" ? p.paidDate : null,
      wasLate: p.missedDate !== null,
      canReport: open && !reported && status !== "repossessed" && (overdue || p.weekNumber === currentWeek),
      canWithdraw: open && reported,
    };
  });

  return {
    riderName: bike.riderName,
    riderPhone: bike.riderPhone,
    bikeModel: bike.bikeModel,
    plateNumber: bike.plateNumber,
    hasPhoto: Boolean(bike.riderPhotoUrl),
    startDate: bike.startDate,
    weeklyAmount: bike.weeklyAmount,
    totalValue: bike.totalValue,
    numPayments: bike.numPayments,
    paidCount: paidCount(bike.payments),
    paidAmount: collectedTotal(bike.payments),
    leftAmount: outstandingTotal(bike.payments),
    missedCount,
    graceAllowance: bike.graceAllowance,
    flagged: grace.flagged,
    status,
    repossessed: status === "repossessed",
    payments,
    missedLog: bike.payments
      .filter((p) => p.missedDate !== null)
      .map((p) => ({ weekNumber: p.weekNumber, dueDate: p.dueDate, madeUpDate: p.madeUpDate, note: p.reason })),
  };
}
