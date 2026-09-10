export function ProgressBar({ pct, color }: { pct: number; color: string }) {
  const clamped = Math.max(0, Math.min(100, pct));
  return (
    <div className="bg-track rounded-full h-2 overflow-hidden">
      <div
        className="h-full rounded-full"
        style={{ width: `${clamped}%`, background: color }}
      />
    </div>
  );
}
