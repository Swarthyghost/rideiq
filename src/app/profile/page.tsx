import Link from "next/link";
import { requireSessionUser } from "@/lib/session";
import { getOwnerProfile, listBikesWithPayments } from "@/lib/firebase/bikes-admin";
import { computeRoi, formatPercent } from "@/lib/payments";
import { formatGHS } from "@/lib/format";
import { BackNav } from "@/components/Navbar";
import { Avatar } from "@/components/Avatar";
import { OwnerProfileForm } from "@/components/OwnerProfileForm";

export default async function ProfilePage() {
  const user = await requireSessionUser();
  const [profile, bikes] = await Promise.all([getOwnerProfile(user.uid), listBikesWithPayments()]);

  const rows = bikes.map((bike) => ({ bike, roi: computeRoi(bike.capitalInvested, bike.payments) }));
  const tracked = rows.filter((r) => r.roi !== null);

  const totalCapital = tracked.reduce((s, r) => s + r.roi!.capital, 0);
  const totalRevenue = tracked.reduce((s, r) => s + r.roi!.revenue, 0);
  const portfolioRoi = totalCapital > 0 ? ((totalRevenue - totalCapital) / totalCapital) * 100 : null;

  // Full contract value each rider has agreed to pay -- what the capital is expected to return.
  const totalExpected = tracked.reduce((s, r) => s + r.bike.totalValue, 0);
  const expectedRoi = totalCapital > 0 ? ((totalExpected - totalCapital) / totalCapital) * 100 : null;
  const expectedRoiOf = (capital: number, expected: number) => ((expected - capital) / capital) * 100;

  const fullName = `${profile.firstName} ${profile.lastName}`.trim();
  const roiColor = (v: number) => (v >= 0 ? "var(--color-status-ok-fg)" : "#a3271f");

  return (
    <div className="flex-1 flex flex-col">
      <BackNav />

      <div className="px-4 sm:px-10 py-6 sm:py-8 pb-14 max-w-[1100px] w-full mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <Avatar name={fullName || user.email || "Owner"} size={64} />
          <div>
            <div className="text-[21px] sm:text-[23px] font-extrabold">{fullName || "Your profile"}</div>
            <div className="text-sm text-muted font-semibold mt-1">{user.email}</div>
          </div>
        </div>

        <OwnerProfileForm profile={profile} email={user.email ?? ""} />

        <h2 className="text-lg sm:text-xl font-extrabold mb-4">Return on investment</h2>

        <div className="bg-white border border-border rounded-2xl p-5 sm:p-6 mb-5">
          <div className="text-[12px] font-bold text-muted uppercase tracking-wide">Expected ROI</div>
          <div
            className="text-[40px] sm:text-[48px] leading-none font-extrabold mt-2"
            style={{ color: expectedRoi === null ? "var(--color-muted-2)" : roiColor(expectedRoi) }}
          >
            {expectedRoi === null ? "—" : formatPercent(expectedRoi)}
          </div>
          <div className="text-[13px] text-muted font-semibold mt-2">
            {expectedRoi === null
              ? "Add capital to a bike under Edit terms to see your return."
              : `${formatGHS(totalExpected - totalCapital)} profit once every contract is fully paid`}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 sm:gap-0 sm:divide-x divide-hairline border-t border-hairline mt-5 pt-5">
            <Metric label="Capital invested" value={formatGHS(totalCapital)} />
            <Metric label="Total return" value={formatGHS(totalExpected)} pad />
            <Metric
              label="Net so far"
              value={formatGHS(totalRevenue - totalCapital)}
              note={portfolioRoi === null ? undefined : `${formatPercent(portfolioRoi)} ROI so far`}
              pad
            />
          </div>
        </div>

        <h3 className="text-[15px] font-extrabold mb-3">By rider</h3>
        {rows.length === 0 ? (
          <div className="bg-white border border-border rounded-2xl p-10 text-center text-muted font-semibold">
            No bikes yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {rows.map(({ bike, roi }) => {
              const expected = roi ? expectedRoiOf(roi.capital, bike.totalValue) : null;
              const recovered = roi ? Math.min(100, Math.max(0, roi.recoveredPercent)) : 0;
              return (
                <Link
                  key={bike.id}
                  href={`/bikes/${bike.id}`}
                  className="bg-white border border-border rounded-2xl p-5 hover:border-[#d8d3c4] transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Avatar name={bike.riderName} photoUrl={bike.riderPhotoUrl} size={40} />
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-ink truncate">{bike.riderName}</div>
                      <div className="text-[12px] font-semibold text-muted truncate">{bike.bikeModel}</div>
                    </div>
                    {expected !== null && (
                      <div className="text-right">
                        <div className="text-[22px] leading-none font-extrabold" style={{ color: roiColor(expected) }}>
                          {formatPercent(expected)}
                        </div>
                        <div className="text-[11px] font-semibold text-muted mt-1">expected ROI</div>
                      </div>
                    )}
                  </div>

                  {roi ? (
                    <>
                      <div className="grid grid-cols-3 gap-3 mt-4 text-[13px] font-semibold text-[#3a3630]">
                        <div>
                          <div className="text-[11.5px] text-muted">Capital</div>
                          {formatGHS(roi.capital)}
                        </div>
                        <div>
                          <div className="text-[11.5px] text-muted">Total return</div>
                          {formatGHS(bike.totalValue)}
                        </div>
                        <div>
                          <div className="text-[11.5px] text-muted">Collected</div>
                          {formatGHS(roi.revenue)}
                        </div>
                      </div>
                      <div className="mt-4 h-1.5 rounded-full bg-panel overflow-hidden">
                        <div className="h-full rounded-full bg-[#1f6b45]" style={{ width: `${recovered}%` }} />
                      </div>
                      <div className="text-[11.5px] font-semibold text-muted mt-1.5">
                        {Math.round(roi.recoveredPercent)}% of capital recovered · {formatPercent(roi.roiPercent)} ROI so far
                      </div>
                    </>
                  ) : (
                    <div className="mt-4 text-[13px] font-semibold text-muted-2">
                      Capital not set — add it under Edit terms
                    </div>
                  )}
                </Link>
              );
            })}
          </div>
        )}
        <p className="text-[12px] text-muted font-semibold mt-3">
          ROI = (return − capital) ÷ capital. &ldquo;So far&rdquo; counts only what has been collected.
        </p>
      </div>
    </div>
  );
}

function Metric({ label, value, note, pad }: { label: string; value: string; note?: string; pad?: boolean }) {
  return (
    <div className={pad ? "sm:pl-6" : "sm:pr-6"}>
      <div className="text-[12px] font-semibold text-muted">{label}</div>
      <div className="text-[19px] font-extrabold mt-1">{value}</div>
      {note && <div className="text-[12px] font-semibold text-muted mt-0.5">{note}</div>}
    </div>
  );
}
