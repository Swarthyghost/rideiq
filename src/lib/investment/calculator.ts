import { INVESTMENT_TERMS, type InvestmentTerms } from "@/lib/investment/terms";

export interface InvestmentInput {
  /** Number of bikes to fund. Give this or `amount`. */
  bikes?: number;
  /** Total capital in GHS. Must be a whole multiple of the per-bike amount. */
  amount?: number;
  /** ISO date (yyyy-mm-dd); when given, the maturity date is returned. */
  startDate?: string;
}

export interface InvestmentResult {
  bikes: number;
  totalInvestment: number;
  durationMonths: number;
  targetReturnPercent: number;
  /** Target return over the investment period. */
  targetReturnAmount: number;
  /** Capital plus target return, as scheduled over the whole period. */
  totalScheduledPayout: number;
  maturityDate: string | null;
}

export type InvestmentCalculation =
  | { ok: true; result: InvestmentResult }
  | { ok: false; error: string };

function addMonths(iso: string, months: number): string | null {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return null;
  const date = new Date(y, m - 1 + months, d);
  // Jan 31 + 1 month must land on Feb's last day, not roll into March.
  if (date.getDate() !== d) date.setDate(0);
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${mm}-${dd}`;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

export function calculateInvestment(
  input: InvestmentInput,
  terms: InvestmentTerms = INVESTMENT_TERMS
): InvestmentCalculation {
  const { perBikeAmount, durationMonths, targetAnnualReturnPercent } = terms;

  let bikes: number;
  if (input.bikes !== undefined && input.bikes !== null) {
    bikes = input.bikes;
  } else if (input.amount !== undefined && input.amount !== null) {
    bikes = input.amount / perBikeAmount;
  } else {
    return { ok: false, error: "Give either a number of bikes or an amount." };
  }

  if (!Number.isFinite(bikes) || bikes <= 0) {
    return { ok: false, error: "The investment must be for at least one bike." };
  }
  if (!Number.isInteger(bikes)) {
    return {
      ok: false,
      error: `Investments are made in whole bikes of GHS ${perBikeAmount.toLocaleString("en-US")} each. That amount is not an exact number of bikes.`,
    };
  }

  const totalInvestment = bikes * perBikeAmount;
  const targetReturnAmount = round2(
    totalInvestment * (targetAnnualReturnPercent / 100) * (durationMonths / 12)
  );

  return {
    ok: true,
    result: {
      bikes,
      totalInvestment,
      durationMonths,
      targetReturnPercent: targetAnnualReturnPercent,
      targetReturnAmount,
      totalScheduledPayout: round2(totalInvestment + targetReturnAmount),
      maturityDate: input.startDate ? addMonths(input.startDate, durationMonths) : null,
    },
  };
}
