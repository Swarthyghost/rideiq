export type BikeStatus =
  | "active"
  | "repossession_flagged"
  | "repossessed"
  | "completed";

export interface Bike {
  id: string;
  bikeModel: string;
  plateNumber: string | null;
  riderName: string;
  riderPhone: string;
  riderPhotoUrl: string | null;
  idDocUrl: string | null;
  contractDocUrl: string | null;
  /** ISO date string (yyyy-mm-dd) */
  startDate: string;
  weeklyAmount: number;
  numPayments: number;
  totalValue: number;
  graceAllowance: number;
  missedCount: number;
  status: BikeStatus;
  createdAt: string;
}

export type PaymentStatus = "pending" | "paid" | "missed";

export interface Payment {
  weekNumber: number;
  /** ISO date string (yyyy-mm-dd) */
  dueDate: string;
  amountDue: number;
  status: PaymentStatus;
  /** ISO date string, set when marked paid */
  paidDate: string | null;
  /** ISO date string, set when a previously-missed payment is later paid */
  madeUpDate: string | null;
  reason: string | null;
  /** The date the payment was auto-flagged missed, if ever */
  missedDate: string | null;
}

export interface BikeWithPayments extends Bike {
  payments: Payment[];
}

export interface NewBikeInput {
  bikeModel: string;
  plateNumber: string;
  riderName: string;
  riderPhone: string;
  startDate: string;
  weeklyAmount: number;
  numPayments: number;
  riderPhotoUrl: string | null;
  idDocUrl: string | null;
  contractDocUrl: string | null;
}
