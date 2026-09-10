import { avatarColorFor, initialsFor } from "@/lib/format";

export function Avatar({
  name,
  photoUrl,
  size = 42,
}: {
  name: string;
  photoUrl?: string | null;
  size?: number;
}) {
  if (photoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={photoUrl}
        alt={name}
        width={size}
        height={size}
        className="rounded-full object-cover flex-shrink-0"
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <div
      className="rounded-full flex items-center justify-center font-extrabold text-white flex-shrink-0"
      style={{
        width: size,
        height: size,
        background: avatarColorFor(name),
        fontSize: Math.round(size * 0.33),
      }}
    >
      {initialsFor(name)}
    </div>
  );
}
