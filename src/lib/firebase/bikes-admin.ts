import "server-only";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { generateSchedule, isPastDue, planSweep } from "@/lib/payments";
import { toISODate } from "@/lib/format";
import type { Bike, BikeWithPayments, NewBikeInput, Payment } from "@/lib/types";

const bikesCol = () => adminDb.collection("bikes");
const paymentsCol = (bikeId: string) => bikesCol().doc(bikeId).collection("payments");

function paymentFromDoc(data: FirebaseFirestore.DocumentData): Payment {
  return {
    weekNumber: data.weekNumber,
    dueDate: data.dueDate,
    amountDue: data.amountDue,
    status: data.status,
    paidDate: data.paidDate ?? null,
    madeUpDate: data.madeUpDate ?? null,
    reason: data.reason ?? null,
    missedDate: data.missedDate ?? null,
  };
}

function bikeFromDoc(id: string, data: FirebaseFirestore.DocumentData): Bike {
  return {
    id,
    bikeModel: data.bikeModel,
    plateNumber: data.plateNumber ?? null,
    riderName: data.riderName,
    riderPhone: data.riderPhone,
    riderPhotoUrl: data.riderPhotoUrl ?? null,
    idDocUrl: data.idDocUrl ?? null,
    contractDocUrl: data.contractDocUrl ?? null,
    startDate: data.startDate,
    weeklyAmount: data.weeklyAmount,
    numPayments: data.numPayments,
    totalValue: data.totalValue,
    graceAllowance: data.graceAllowance,
    missedCount: data.missedCount,
    status: data.status,
    createdAt: data.createdAt,
  };
}

export async function listBikesWithPayments(): Promise<BikeWithPayments[]> {
  const snapshot = await bikesCol().get();
  const bikes = await Promise.all(
    snapshot.docs.map(async (doc) => {
      const bike = bikeFromDoc(doc.id, doc.data());
      const paymentsSnap = await paymentsCol(doc.id).orderBy("weekNumber").get();
      const payments = paymentsSnap.docs.map((p) => paymentFromDoc(p.data()));
      return { ...bike, payments };
    })
  );
  return bikes;
}

export async function getBikeWithPayments(bikeId: string): Promise<BikeWithPayments | null> {
  const doc = await bikesCol().doc(bikeId).get();
  if (!doc.exists) return null;
  const bike = bikeFromDoc(doc.id, doc.data()!);
  const paymentsSnap = await paymentsCol(bikeId).orderBy("weekNumber").get();
  const payments = paymentsSnap.docs.map((p) => paymentFromDoc(p.data()));
  return { ...bike, payments };
}

export const DEFAULT_GRACE_ALLOWANCE = 3;

export async function createBike(input: NewBikeInput): Promise<string> {
  const totalValue = input.weeklyAmount * input.numPayments;
  const schedule = generateSchedule(input.startDate, input.weeklyAmount, input.numPayments);

  const bikeRef = bikesCol().doc();
  const batch = adminDb.batch();

  batch.set(bikeRef, {
    bikeModel: input.bikeModel,
    plateNumber: input.plateNumber || null,
    riderName: input.riderName,
    riderPhone: input.riderPhone,
    riderPhotoUrl: input.riderPhotoUrl,
    idDocUrl: input.idDocUrl,
    contractDocUrl: input.contractDocUrl,
    startDate: input.startDate,
    weeklyAmount: input.weeklyAmount,
    numPayments: input.numPayments,
    totalValue,
    graceAllowance: DEFAULT_GRACE_ALLOWANCE,
    missedCount: 0,
    status: "active",
    createdAt: toISODate(new Date()),
  });

  for (const payment of schedule) {
    const paymentRef = paymentsCol(bikeRef.id).doc(String(payment.weekNumber));
    batch.set(paymentRef, payment);
  }

  await batch.commit();
  return bikeRef.id;
}

export interface EditableBikeTerms {
  bikeModel: string;
  plateNumber: string;
  riderName: string;
  riderPhone: string;
  status: Bike["status"];
  weeklyAmount: number;
  totalValue: number;
  riderPhotoUrl?: string | null;
  idDocUrl?: string | null;
  contractDocUrl?: string | null;
}

export async function updateBikeTerms(bikeId: string, terms: EditableBikeTerms): Promise<void> {
  const bikeRef = bikesCol().doc(bikeId);
  const bikeDoc = await bikeRef.get();
  if (!bikeDoc.exists) throw new Error("Bike not found");
  const existing = bikeFromDoc(bikeId, bikeDoc.data()!);

  const patch: Record<string, unknown> = {
    bikeModel: terms.bikeModel,
    plateNumber: terms.plateNumber || null,
    riderName: terms.riderName,
    riderPhone: terms.riderPhone,
    status: terms.status,
    weeklyAmount: terms.weeklyAmount,
    totalValue: terms.totalValue,
  };
  if (terms.riderPhotoUrl !== undefined) patch.riderPhotoUrl = terms.riderPhotoUrl;
  if (terms.idDocUrl !== undefined) patch.idDocUrl = terms.idDocUrl;
  if (terms.contractDocUrl !== undefined) patch.contractDocUrl = terms.contractDocUrl;

  const batch = adminDb.batch();
  batch.update(bikeRef, patch);

  // A weekly-payment change only applies going forward: paid weeks keep the
  // amount that was actually collected, historically.
  if (terms.weeklyAmount !== existing.weeklyAmount) {
    const paymentsSnap = await paymentsCol(bikeId).where("status", "!=", "paid").get();
    for (const doc of paymentsSnap.docs) {
      batch.update(doc.ref, { amountDue: terms.weeklyAmount });
    }
  }

  await batch.commit();
}

export async function markPaymentPaid(
  bikeId: string,
  weekNumber: number,
  reason: string | null
): Promise<void> {
  const paymentRef = paymentsCol(bikeId).doc(String(weekNumber));
  const paymentDoc = await paymentRef.get();
  if (!paymentDoc.exists) throw new Error("Payment not found");

  const payment = paymentFromDoc(paymentDoc.data()!);
  const todayISO = toISODate(new Date());
  const wasMissed = payment.status === "missed" || isPastDue(payment.dueDate, new Date());

  await paymentRef.update({
    status: "paid",
    paidDate: todayISO,
    ...(wasMissed
      ? {
          madeUpDate: todayISO,
          reason: reason ?? payment.reason,
          missedDate: payment.missedDate ?? todayISO,
        }
      : {}),
  });

  // Recompute this bike's live missed count / status after the change.
  const bikeDoc = await bikesCol().doc(bikeId).get();
  if (!bikeDoc.exists) return;
  const bike = bikeFromDoc(bikeId, bikeDoc.data()!);
  const paymentsSnap = await paymentsCol(bikeId).orderBy("weekNumber").get();
  const payments = paymentsSnap.docs.map((p) => paymentFromDoc(p.data()));
  const plan = planSweep(bike, payments, new Date());

  await bikesCol().doc(bikeId).update({
    missedCount: plan.newMissedCount,
    status: plan.newStatus,
  });
}

/**
 * Manually flags the current-due payment as missed, ahead of the automatic
 * overdue sweep -- lets the admin record a grace strike immediately instead
 * of waiting for the next daily run. Only valid for a payment that isn't
 * already paid.
 */
export async function markPaymentMissed(
  bikeId: string,
  weekNumber: number,
  reason: string | null
): Promise<void> {
  const paymentRef = paymentsCol(bikeId).doc(String(weekNumber));
  const paymentDoc = await paymentRef.get();
  if (!paymentDoc.exists) throw new Error("Payment not found");

  const payment = paymentFromDoc(paymentDoc.data()!);
  if (payment.status === "paid") throw new Error("This week has already been paid");

  const todayISO = toISODate(new Date());
  await paymentRef.update({
    status: "missed",
    missedDate: payment.missedDate ?? todayISO,
    reason: reason ?? payment.reason,
  });

  const bikeDoc = await bikesCol().doc(bikeId).get();
  if (!bikeDoc.exists) return;
  const bike = bikeFromDoc(bikeId, bikeDoc.data()!);
  const paymentsSnap = await paymentsCol(bikeId).orderBy("weekNumber").get();
  const payments = paymentsSnap.docs.map((p) => paymentFromDoc(p.data()));
  const plan = planSweep(bike, payments, new Date());

  const batch = adminDb.batch();
  for (const update of plan.paymentUpdates) {
    batch.update(paymentsCol(bikeId).doc(String(update.weekNumber)), update.patch);
  }
  batch.update(bikesCol().doc(bikeId), {
    missedCount: plan.newMissedCount,
    status: plan.newStatus,
  });
  await batch.commit();
}

export interface SweepResult {
  bikesScanned: number;
  paymentsMarkedMissed: number;
  bikesFlagged: string[];
}

/**
 * The daily sweep: for every active bike, finds pending payments now past
 * due, marks them missed, and updates the bike's missedCount/status.
 */
export async function runMissedPaymentSweep(): Promise<SweepResult> {
  const asOf = new Date();
  const snapshot = await bikesCol().where("status", "==", "active").get();

  let paymentsMarkedMissed = 0;
  const bikesFlagged: string[] = [];

  for (const bikeDoc of snapshot.docs) {
    const bike = bikeFromDoc(bikeDoc.id, bikeDoc.data());
    const paymentsSnap = await paymentsCol(bikeDoc.id)
      .where("status", "==", "pending")
      .get();
    const pendingPayments = paymentsSnap.docs.map((p) => paymentFromDoc(p.data()));
    if (pendingPayments.length === 0) continue;

    // planSweep needs the full picture to compute an accurate missedCount,
    // but only pending payments can change state here, so fetch all payments.
    const allPaymentsSnap = await paymentsCol(bikeDoc.id).orderBy("weekNumber").get();
    const allPayments = allPaymentsSnap.docs.map((p) => paymentFromDoc(p.data()));

    const plan = planSweep(bike, allPayments, asOf);
    if (plan.paymentUpdates.length === 0 && !plan.statusChanged) continue;

    const batch = adminDb.batch();
    for (const update of plan.paymentUpdates) {
      batch.update(paymentsCol(bikeDoc.id).doc(String(update.weekNumber)), update.patch);
      paymentsMarkedMissed++;
    }
    batch.update(bikeDoc.ref, {
      missedCount: plan.newMissedCount,
      status: plan.newStatus,
    });
    await batch.commit();

    if (plan.newStatus === "repossession_flagged") bikesFlagged.push(bikeDoc.id);
  }

  return {
    bikesScanned: snapshot.size,
    paymentsMarkedMissed,
    bikesFlagged,
  };
}

export { FieldValue };
