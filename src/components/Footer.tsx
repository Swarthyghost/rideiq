"use client";

import { usePathname } from "next/navigation";

export function Footer() {
  const pathname = usePathname();
  // The login page already shows the motto directly below the sign-in
  // card -- skip the global footer there to avoid showing it twice.
  if (pathname === "/login") return null;

  return (
    <footer className="border-t border-hairline px-4 sm:px-10 py-4 text-center flex-shrink-0">
      <span className="text-[12.5px] font-semibold text-muted-2 italic">
        Empowering the Youth, One Ride at a Time.
      </span>
    </footer>
  );
}
