import "server-only";
import { listBikesWithPayments } from "@/lib/firebase/bikes-admin";
import {
  collectedTotal,
  computeGraceStatus,
  computeLiveMissedCount,
  computeLiveStatus,
  paidCount,
} from "@/lib/payments";
import type { BikeWithPayments } from "@/lib/types";

async function findBike(idOrRiderName: string): Promise<BikeWithPayments | null> {
  const bikes = await listBikesWithPayments();
  const byId = bikes.find((b) => b.id === idOrRiderName);
  if (byId) return byId;

  const needle = idOrRiderName.trim().toLowerCase();
  const exact = bikes.find((b) => b.riderName.toLowerCase() === needle);
  if (exact) return exact;

  const partial = bikes.filter((b) => b.riderName.toLowerCase().includes(needle));
  return partial.length === 1 ? partial[0] : partial[0] ?? null;
}

export async function getTotalCollected(args: { period?: "all" | "this_month" }) {
  const period = args.period ?? "all";
  const bikes = await listBikesWithPayments();
  const now = new Date();

  let total = 0;
  let bikeCount = 0;
  for (const bike of bikes) {
    bikeCount++;
    for (const p of bike.payments) {
      if (p.status !== "paid" || !p.paidDate) continue;
      if (period === "this_month") {
        const paid = new Date(p.paidDate);
        if (paid.getFullYear() !== now.getFullYear() || paid.getMonth() !== now.getMonth()) {
          continue;
        }
      }
      total += p.amountDue;
    }
  }

  return { period, totalCollected: total, bikeCount };
}

export async function listBikes(args: { statusFilter?: string }) {
  const bikes = await listBikesWithPayments();
  const asOf = new Date();

  const summaries = bikes.map((bike) => {
    const missedCount = computeLiveMissedCount(bike.payments, asOf);
    const liveStatus = computeLiveStatus(bike, bike.payments, asOf);
    return {
      bikeId: bike.id,
      riderName: bike.riderName,
      bikeModel: bike.bikeModel,
      plateNumber: bike.plateNumber,
      status: liveStatus,
      paidCount: paidCount(bike.payments),
      totalPayments: bike.numPayments,
      paidAmount: collectedTotal(bike.payments),
      totalValue: bike.totalValue,
      missedCount,
      graceAllowance: bike.graceAllowance,
    };
  });

  const filtered = args.statusFilter
    ? summaries.filter((s) => s.status === args.statusFilter)
    : summaries;

  return { bikes: filtered };
}

export async function getBikeSummary(args: { bikeIdOrRiderName: string }) {
  const bike = await findBike(args.bikeIdOrRiderName);
  if (!bike) return { error: `No bike or rider found matching "${args.bikeIdOrRiderName}"` };

  const asOf = new Date();
  const missedCount = computeLiveMissedCount(bike.payments, asOf);
  const liveStatus = computeLiveStatus(bike, bike.payments, asOf);
  const paid = paidCount(bike.payments);
  const paidAmount = collectedTotal(bike.payments);
  const grace = computeGraceStatus(missedCount, bike.graceAllowance);

  return {
    bikeId: bike.id,
    riderName: bike.riderName,
    riderPhone: bike.riderPhone,
    bikeModel: bike.bikeModel,
    plateNumber: bike.plateNumber,
    status: liveStatus,
    weeklyAmount: bike.weeklyAmount,
    totalValue: bike.totalValue,
    paidCount: paid,
    totalPayments: bike.numPayments,
    remainingCount: bike.numPayments - paid,
    paidAmount,
    remainingAmount: bike.totalValue - paidAmount,
    weeksRemaining: bike.numPayments - paid,
    startDate: bike.startDate,
    missedCount,
    graceAllowance: bike.graceAllowance,
    graceRemaining: grace.graceRemaining,
  };
}

export async function getGraceStatus(args: { bikeIdOrRiderName: string }) {
  const bike = await findBike(args.bikeIdOrRiderName);
  if (!bike) return { error: `No bike or rider found matching "${args.bikeIdOrRiderName}"` };

  const missedCount = computeLiveMissedCount(bike.payments, new Date());
  const grace = computeGraceStatus(missedCount, bike.graceAllowance);

  return {
    bikeId: bike.id,
    riderName: bike.riderName,
    ...grace,
  };
}

export async function listFlaggedForRepossession() {
  const bikes = await listBikesWithPayments();
  const asOf = new Date();

  const flagged = bikes
    .filter((bike) => computeLiveStatus(bike, bike.payments, asOf) === "repossession_flagged")
    .map((bike) => ({
      bikeId: bike.id,
      riderName: bike.riderName,
      bikeModel: bike.bikeModel,
      missedCount: computeLiveMissedCount(bike.payments, asOf),
      graceAllowance: bike.graceAllowance,
    }));

  return { flagged };
}

export async function getWeeksRemaining(args: { bikeIdOrRiderName: string }) {
  const bike = await findBike(args.bikeIdOrRiderName);
  if (!bike) return { error: `No bike or rider found matching "${args.bikeIdOrRiderName}"` };

  const paid = paidCount(bike.payments);
  return {
    bikeId: bike.id,
    riderName: bike.riderName,
    weeksRemaining: bike.numPayments - paid,
    totalPayments: bike.numPayments,
    paidCount: paid,
  };
}

// Groq's chat-completions API is OpenAI-compatible: each tool is
// { type: "function", function: { name, description, parameters } },
// where `parameters` is a JSON Schema object.
export const princeTools = [
  {
    type: "function" as const,
    function: {
      name: "getTotalCollected",
      description: "Sum of paid payment amounts across all bikes, optionally filtered to the current calendar month.",
      parameters: {
        type: "object" as const,
        properties: {
          period: { type: "string", enum: ["all", "this_month"], description: "Defaults to 'all'." },
        },
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "listBikes",
      description: "Summary per bike: rider, status, paid/total counts, paid/total amounts, missedCount. Optionally filter by status.",
      parameters: {
        type: "object" as const,
        properties: {
          statusFilter: {
            type: "string",
            enum: ["active", "repossession_flagged", "repossessed", "completed"],
          },
        },
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "getBikeSummary",
      description: "Full detail for one bike: weekly amount, total value, paid amount/count, remaining amount/count, weeks remaining, status, missedCount, grace remaining. Accepts a bike id or a rider name.",
      parameters: {
        type: "object" as const,
        properties: {
          bikeIdOrRiderName: { type: "string" },
        },
        required: ["bikeIdOrRiderName"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "getGraceStatus",
      description: "missedCount, graceAllowance, graceRemaining, and whether the bike is flagged, for one bike. Accepts a bike id or a rider name.",
      parameters: {
        type: "object" as const,
        properties: {
          bikeIdOrRiderName: { type: "string" },
        },
        required: ["bikeIdOrRiderName"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "listFlaggedForRepossession",
      description: "Lists every bike currently flagged for repossession (missed count exceeds grace allowance).",
      parameters: {
        type: "object" as const,
        properties: {},
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "getWeeksRemaining",
      description: "Weeks (payments) remaining on one bike's schedule. Accepts a bike id or a rider name.",
      parameters: {
        type: "object" as const,
        properties: {
          bikeIdOrRiderName: { type: "string" },
        },
        required: ["bikeIdOrRiderName"],
      },
    },
  },
];

export async function callPrinceTool(name: string, input: Record<string, unknown>) {
  switch (name) {
    case "getTotalCollected":
      return getTotalCollected(input as { period?: "all" | "this_month" });
    case "listBikes":
      return listBikes(input as { statusFilter?: string });
    case "getBikeSummary":
      return getBikeSummary(input as { bikeIdOrRiderName: string });
    case "getGraceStatus":
      return getGraceStatus(input as { bikeIdOrRiderName: string });
    case "listFlaggedForRepossession":
      return listFlaggedForRepossession();
    case "getWeeksRemaining":
      return getWeeksRemaining(input as { bikeIdOrRiderName: string });
    default:
      return { error: `Unknown tool: ${name}` };
  }
}
