import type { GraceStatus } from "@/lib/payments";

export function GraceIndicator({ grace }: { grace: GraceStatus }) {
  const flagged = grace.flagged;

  return (
    <div
      className="flex items-center gap-3 rounded-xl border px-4 py-3 mb-6"
      style={{
        background: flagged ? "var(--color-status-flagged-bg)" : "var(--color-panel)",
        borderColor: flagged ? "#f0c9c5" : "var(--color-border)",
      }}
    >
      <div className="flex items-center gap-1.5">
        {Array.from({ length: grace.graceAllowance }, (_, i) => {
          const used = i < grace.missedCount;
          return (
            <span
              key={i}
              className="w-3 h-3 rounded-full"
              style={{
                background: used ? "#a3271f" : "#d8d3c4",
              }}
            />
          );
        })}
      </div>

      <div className="text-[13px] font-bold" style={{ color: flagged ? "#a3271f" : "#3a3630" }}>
        {flagged
          ? `Grace period used — flagged for repossession (${grace.missedCount} of ${grace.graceAllowance} missed)`
          : `${grace.graceRemaining} grace left`}
      </div>
    </div>
  );
}
