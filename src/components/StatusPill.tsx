import type { StatusDisplay } from "@/lib/status";

export function StatusPill({ status }: { status: StatusDisplay }) {
  return (
    <span
      className="text-[12px] font-extrabold px-2.5 py-1 rounded-full whitespace-nowrap"
      style={{ background: status.bg, color: status.fg }}
    >
      {status.label}
    </span>
  );
}
