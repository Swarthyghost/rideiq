/**
 * The one place RideIQ's investor terms live. The calculator, Prince and its
 * tool all read from here, so a change to a rule is a single-line edit.
 * (knowledge/investor-faq.md quotes the same figures in prose -- keep it in step.)
 */
export const INVESTMENT_TERMS = {
  /** Purchase + registration of one motorcycle, in GHS. */
  perBikeAmount: 12500,
  durationMonths: 12,
  /** A target, not a guaranteed return. */
  targetAnnualReturnPercent: 20,
  supportWhatsApp: "0266181581",
} as const;

export type InvestmentTerms = typeof INVESTMENT_TERMS;
