"use client";

import { useState } from "react";
import { SparkleIcon } from "@/components/icons";
import { useAuth } from "@/lib/firebase/auth-context";
import { PrinceChatPanel } from "@/components/PrinceChatPanel";

export function AskPrinceButton() {
  const [open, setOpen] = useState(false);
  const { user } = useAuth();

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-5 sm:bottom-7 sm:right-8 bg-brand text-cream rounded-full shadow-[0_8px_24px_rgba(28,42,36,0.24)] flex items-center gap-2 font-extrabold text-[14.5px] cursor-pointer hover:opacity-95 transition-opacity z-40 w-14 h-14 justify-center sm:w-auto sm:h-auto sm:px-5.5 sm:py-3.5"
        aria-label="Ask Prince"
      >
        <SparkleIcon size={20} />
        <span className="hidden sm:inline">Ask Prince</span>
      </button>
      <PrinceChatPanel open={open} onClose={() => setOpen(false)} signedIn={Boolean(user)} />
    </>
  );
}
