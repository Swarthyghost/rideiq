"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/firebase/auth-context";
import { MenuIcon, PlusIcon, CloseIcon } from "@/components/icons";
import { Logo } from "@/components/Logo";

export function Navbar() {
  const { signOut } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <nav className="bg-brand relative">
      <div className="px-4 sm:px-10 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Logo size={34} />
          <div className="flex flex-col leading-tight">
            <span className="text-cream text-[17px] sm:text-[19px] font-extrabold tracking-tight">
              RiderIQ
            </span>
            <span className="text-cream/65 text-[9px] sm:text-[10px] font-bold uppercase tracking-wide">
              Work &amp; Pay, Redefined.
            </span>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-6">
          <Link
            href="/bikes/new"
            className="flex items-center gap-2 bg-white/[0.14] hover:opacity-90 text-cream border border-white/35 rounded-lg px-4.5 py-2.5 font-bold text-sm transition-opacity"
          >
            <PlusIcon size={16} />
            Add bike
          </Link>
          <button
            onClick={signOut}
            className="text-cream/75 hover:text-cream text-sm font-semibold cursor-pointer"
          >
            Sign out
          </button>
        </div>

        <button
          className="sm:hidden text-cream"
          onClick={() => setMenuOpen((v) => !v)}
          aria-label="Menu"
        >
          {menuOpen ? <CloseIcon size={22} /> : <MenuIcon size={22} />}
        </button>
      </div>

      {menuOpen && (
        <div className="sm:hidden bg-brand border-t border-white/15 px-4 py-3 flex flex-col gap-3">
          <Link
            href="/bikes/new"
            onClick={() => setMenuOpen(false)}
            className="flex items-center gap-2 bg-white/[0.14] text-cream border border-white/35 rounded-lg px-4 py-2.5 font-bold text-sm justify-center"
          >
            <PlusIcon size={16} />
            Add bike
          </Link>
          <button
            onClick={signOut}
            className="text-cream/85 text-sm font-semibold py-1.5 cursor-pointer"
          >
            Sign out
          </button>
        </div>
      )}
    </nav>
  );
}

export function BackNav({ label = "Back to dashboard" }: { label?: string }) {
  return (
    <nav className="bg-brand px-4 sm:px-10 py-4 flex items-center gap-3.5">
      <Link href="/" className="flex items-center gap-3.5 text-cream/85 hover:text-cream">
        <svg
          width={18}
          height={18}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2.4}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M15 6l-6 6 6 6" />
        </svg>
        <span className="text-sm font-bold">{label}</span>
      </Link>
    </nav>
  );
}
