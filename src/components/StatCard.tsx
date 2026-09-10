export function StatCard({
  label,
  value,
  color = "var(--color-ink)",
}: {
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <div className="bg-white border border-border rounded-xl px-4 py-4 sm:px-5">
      <div className="text-[11px] sm:text-[12.5px] font-bold text-muted uppercase tracking-wide mb-1.5 sm:mb-2">
        {label}
      </div>
      <div className="text-[19px] sm:text-[26px] font-extrabold" style={{ color }}>
        {value}
      </div>
    </div>
  );
}
