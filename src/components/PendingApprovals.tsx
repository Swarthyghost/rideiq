"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Avatar } from "@/components/Avatar";
import { formatDateShort, formatGHS } from "@/lib/format";

export interface PendingApproval {
  bikeId: string;
  riderName: string;
  riderPhotoUrl: string | null;
  weekNumber: number;
  amount: number;
  dueDate: string;
  reportedDate: string;
  late: boolean;
}

export function PendingApprovals({ items }: { items: PendingApproval[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (items.length === 0) return null;

  async function act(item: PendingApproval, kind: "approve" | "reject") {
    const key = `${item.bikeId}:${item.weekNumber}`;
    setBusy(key);
    setError(null);
    try {
      const response = await fetch(kind === "approve" ? "/api/payments/mark-paid" : "/api/payments/reject-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bikeId: item.bikeId, weekNumber: item.weekNumber, reason: null }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Failed");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Try again.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="bg-white border border-[#c5d6ef] rounded-2xl mb-8 overflow-hidden">
      <div className="px-5 py-3.5 bg-[#e6eefa] text-[#1f4f8f] text-[14px] font-extrabold">
        Waiting for your approval ({items.length})
      </div>
      <div className="divide-y divide-hairline">
        {items.map((item) => {
          const key = `${item.bikeId}:${item.weekNumber}`;
          return (
            <div key={key} className="px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <Avatar name={item.riderName} photoUrl={item.riderPhotoUrl} size={40} />
                <div className="min-w-0">
                  <div className="font-bold truncate">
                    {item.riderName} · Week {item.weekNumber} · {formatGHS(item.amount)}
                  </div>
                  <div className="text-[12.5px] font-semibold text-muted">
                    Says they paid on {formatDateShort(item.reportedDate)} · due {formatDateShort(item.dueDate)}
                    {item.late ? " · past due, approving counts as a late payment" : ""}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => act(item, "approve")}
                  disabled={busy === key}
                  className="bg-[#1f6b45] hover:opacity-85 text-white rounded-[7px] px-4 py-2 font-bold text-[13px] cursor-pointer disabled:opacity-50"
                >
                  {busy === key ? "Saving…" : "Approve"}
                </button>
                <button
                  onClick={() => act(item, "reject")}
                  disabled={busy === key}
                  className="bg-white border border-[#e0b4af] hover:bg-status-flagged-bg text-[#a3271f] rounded-[7px] px-4 py-2 font-bold text-[13px] cursor-pointer disabled:opacity-50"
                >
                  Not received
                </button>
              </div>
            </div>
          );
        })}
      </div>
      {error && <div className="px-5 py-3 text-[13px] font-semibold text-[#a3271f]">{error}</div>}
    </div>
  );
}
