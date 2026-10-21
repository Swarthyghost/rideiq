import "server-only";
import { calculateInvestmentTool, callPublicTool } from "@/lib/prince/tools";
import { buildRiderView } from "@/lib/rider-view";
import type { BikeWithPayments } from "@/lib/types";

const getMyAccountTool = {
  type: "function" as const,
  function: {
    name: "getMyAccount",
    description:
      "The signed-in rider's OWN account: what they have paid and still owe, their next payment, how many late payments (strikes) they have used out of the allowed three, and any payment they have sent that is waiting for the owner to approve. Use it for any question about their balance, payments, due dates or status. It can only ever return this one rider's data.",
    parameters: { type: "object" as const, properties: {} },
  },
};

export const riderPrinceTools = [getMyAccountTool, calculateInvestmentTool];

function accountSummary(bike: BikeWithPayments) {
  const view = buildRiderView(bike);
  const next = view.payments.find((p) => p.state !== "paid");
  return {
    riderName: view.riderName,
    bikeModel: view.bikeModel,
    weeklyAmount: view.weeklyAmount,
    totalContract: view.totalValue,
    paymentsDone: view.paidCount,
    totalPayments: view.numPayments,
    paymentsLeft: view.numPayments - view.paidCount,
    amountPaid: view.paidAmount,
    amountLeft: view.leftAmount,
    lateStrikesUsed: view.missedCount,
    lateStrikesAllowed: view.graceAllowance,
    bikeFlaggedForRepossession: view.flagged,
    nextPayment: next
      ? { week: next.weekNumber, dueDate: next.dueDate, amount: next.amountDue, state: next.state }
      : null,
    waitingForOwnerApproval: view.payments
      .filter((p) => p.state === "awaiting")
      .map((p) => ({ week: p.weekNumber, amount: p.amountDue })),
  };
}

/** Only these two tools exist in rider mode, and both are bound to the one rider's own record. */
export async function callRiderTool(name: string, input: Record<string, unknown>, bike: BikeWithPayments) {
  if (name === "getMyAccount") return accountSummary(bike);
  if (name === "calculateInvestment") return callPublicTool(name, input);
  return { error: "That isn't available here." };
}
