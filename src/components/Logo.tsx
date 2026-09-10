export function Logo({ size = 36 }: { size?: number }) {
  return (
    <div
      className="rounded-full bg-white flex items-center justify-center flex-shrink-0 overflow-hidden"
      style={{ width: size, height: size }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/logo.webp"
        alt="RiderIQ"
        className="w-full h-full object-contain"
        style={{ padding: Math.round(size * 0.12) }}
      />
    </div>
  );
}
