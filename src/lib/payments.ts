import { parseISODate, toISODate } from "@/lib/format";
import type { Bike, BikeStatus, Payment } from "@/lib/types";

/** Generates the full weekly payment schedule for a new bike, due dates stepping 7 days from startDate. */
export function generateSchedule(
  startDate: string,
  weeklyAmount: number,
  numPayments: number
): Payment[] {
  const start = parseISODate(startDate);
  const payments: Payment[] = [];
  for (let week = 1; week <= numPayments; week++) {
    const due = new Date(start);
    due.setDate(due.getDate() + 7 * (week - 1));
    payments.push({
      weekNumber: week,
      dueDate: toISODate(due),
      amountDue: weeklyAmount,
      status: "pending",
      paidDate: null,
      madeUpDate: null,
      reason: null,
      missedDate: null,
    });
  }
  return payments;
}

export function isPastDue(dueDate: string, asOf: Date): boolean {
  const due = parseISODate(dueDate);
  const today = new Date(asOf.getFullYear(), asOf.getMonth(), asOf.getDate());
  return due < today;
}

/**
 * Live-computed missed count: payments already flagged 'missed' in Firestore,
 * plus any 'pending' payment now past due that the cron sweep hasn't caught yet.
 * This is what makes the dashboard accurate even between cron runs.
 */
export function computeLiveMissedCount(payments: Payment[], asOf: Date): number {
  let count = 0;
  for (const p of payments) {
    if (p.status === "missed") count++;
    else if (p.status === "pending" && isPastDue(p.dueDate, asOf)) count++;
  }
  return count;
}

export interface GraceStatus {
  missedCount: number;
  graceAllowance: number;
  graceRemaining: number;
  flagged: boolean;
}

export function computeGraceStatus(
  missedCount: number,
  graceAllowance: number
): GraceStatus {
  const graceRemaining = Math.max(graceAllowance - missedCount, 0);
  return {
    missedCount,
    graceAllowance,
    graceRemaining,
    flagged: missedCount > graceAllowance,
  };
}

/** Live-computed bike status, independent of whether the cron has persisted it yet. */
export function computeLiveStatus(
  bike: Pick<Bike, "status" | "graceAllowance">,
  payments: Payment[],
  asOf: Date
): BikeStatus {
  if (bike.status === "repossessed" || bike.status === "completed") {
    return bike.status;
  }
  const missedCount = computeLiveMissedCount(payments, asOf);
  return missedCount > bike.graceAllowance ? "repossession_flagged" : "active";
}

export interface PaymentUpdate {
  weekNumber: number;
  patch: Partial<Payment>;
}

export interface SweepPlan {
  paymentUpdates: PaymentUpdate[];
  newMissedCount: number;
  newStatus: BikeStatus;
  statusChanged: boolean;
}

/**
 * Pure planning function for the daily sweep: figures out which pending
 * payments are now past due, and what the bike's resulting missedCount /
 * status should become. Persistence is the caller's job (cron route).
 */
export function planSweep(
  bike: Pick<Bike, "status" | "graceAllowance" | "missedCount">,
  payments: Payment[],
  asOf: Date
): SweepPlan {
  const paymentUpdates: PaymentUpdate[] = [];
  const todayISO = toISODate(asOf);

  for (const p of payments) {
    if (p.status === "pending" && isPastDue(p.dueDate, asOf)) {
      paymentUpdates.push({
        weekNumber: p.weekNumber,
        patch: { status: "missed", missedDate: todayISO },
      });
    }
  }

  const newMissedCount = computeLiveMissedCount(payments, asOf);
  const newStatus = computeLiveStatus(bike, payments, asOf);
  const statusChanged = newStatus !== bike.status;

  return { paymentUpdates, newMissedCount, newStatus, statusChanged };
}

export function collectedTotal(payments: Payment[]): number {
  return payments
    .filter((p) => p.status === "paid")
    .reduce((sum, p) => sum + p.amountDue, 0);
}

export function paidCount(payments: Payment[]): number {
  return payments.filter((p) => p.status === "paid").length;
}
