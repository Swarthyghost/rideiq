import { requireSessionUser } from "@/lib/session";
import { listBikesWithPayments } from "@/lib/firebase/bikes-admin";
import { computeLiveMissedCount, computeLiveStatus } from "@/lib/payments";
import { formatGHS } from "@/lib/format";
import { Navbar } from "@/components/Navbar";
import { StatCard } from "@/components/StatCard";
import { BikeCard } from "@/components/BikeCard";
import { AskPrinceButton } from "@/components/AskPrinceButton";

export default async function DashboardPage() {
  await requireSessionUser();
  const bikes = await listBikesWithPayments();
  const asOf = new Date();

  const derived = bikes.map((bike) => ({
    bike,
    missedCount: computeLiveMissedCount(bike.payments, asOf),
    liveStatus: computeLiveStatus(bike, bike.payments, asOf),
  }));

  const activeBikes = derived.filter(
    (d) => d.liveStatus === "active" || d.liveStatus === "repossession_flagged"
  ).length;

  const now = new Date();
  const collectedThisMonth = bikes.reduce((sum, bike) => {
    const monthPaid = bike.payments
      .filter((p) => {
        if (p.status !== "paid" || !p.paidDate) return false;
        const d = new Date(p.paidDate);
        return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
      })
      .reduce((s, p) => s + p.amountDue, 0);
    return sum + monthPaid;
  }, 0);

  const inGraceZone = derived.filter(
    (d) => d.liveStatus === "active" && d.missedCount > 0
  ).length;
  const flagged = derived.filter((d) => d.liveStatus === "repossession_flagged").length;

  const statusWeight: Record<string, number> = {
    repossession_flagged: 0,
    active: 1,
    repossessed: 2,
    completed: 3,
  };

  const sorted = [...derived].sort((a, b) => {
    const weightDiff = statusWeight[a.liveStatus] - statusWeight[b.liveStatus];
    if (weightDiff !== 0) return weightDiff;
    return b.missedCount - a.missedCount;
  });

  return (
    <div className="flex-1 flex flex-col">
      <Navbar />

      <div className="px-4 sm:px-10 py-6 sm:py-9 pb-16 sm:pb-14 flex-1">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4.5 mb-8 sm:mb-9">
          <StatCard label="Active bikes" value={String(activeBikes)} />
          <StatCard label="Collected this month" value={formatGHS(collectedThisMonth)} />
          <StatCard
            label="In grace zone"
            value={String(inGraceZone)}
            color="var(--color-status-grace-fg)"
          />
          <StatCard
            label="Flagged for repossession"
            value={String(flagged)}
            color="var(--color-status-flagged-fg)"
          />
        </div>

        <div className="flex items-baseline justify-between mb-4.5">
          <h1 className="text-lg sm:text-xl font-extrabold">Your bikes</h1>
          <span className="text-[13.5px] text-muted font-semibold hidden sm:inline">
            Sorted: overdue &amp; flagged first
          </span>
        </div>

        {sorted.length === 0 ? (
          <div className="bg-white border border-border rounded-2xl p-10 text-center text-muted font-semibold">
            No bikes yet. Add your first bike to generate its payment schedule.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4.5 sm:gap-5.5">
            {sorted.map(({ bike }) => (
              <BikeCard key={bike.id} bike={bike} />
            ))}
          </div>
        )}
      </div>

      <AskPrinceButton />
    </div>
  );
}
