"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/Logo";

export function RiderPinGate({ token }: { token: string }) {
  const router = useRouter();
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (pin.length < 4 || loading) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/rider/${token}/unlock`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Something went wrong.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setPin("");
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center gap-3 mb-7">
          <div className="rounded-full ring-1 ring-border shadow-sm">
            <Logo size={56} />
          </div>
          <div className="text-xl font-extrabold tracking-tight">RiderIQ</div>
          <div className="text-sm font-semibold text-muted text-center">
            Enter the last 4 digits of your phone number to see your payments.
          </div>
        </div>

        <form onSubmit={handleSubmit} className="bg-white border border-border rounded-[14px] p-6 flex flex-col gap-4">
          <input
            autoFocus
            inputMode="numeric"
            autoComplete="off"
            maxLength={4}
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
            placeholder="••••"
            aria-label="Last 4 digits of your phone number"
            className="w-full text-center tracking-[0.5em] font-extrabold text-[24px] px-3.5 py-3 border border-border-input rounded-lg bg-white focus:outline-none focus:border-[#1f6b45] focus:ring-3 focus:ring-[#1f6b45]/15"
          />
          {error && (
            <div className="text-[13px] font-semibold text-[#a3271f] bg-status-flagged-bg rounded-lg px-3 py-2">
              {error}
            </div>
          )}
          <button
            type="submit"
            disabled={loading || pin.length < 4}
            className="w-full bg-brand text-cream font-extrabold text-[15px] rounded-[9px] py-3 hover:opacity-90 disabled:opacity-60 cursor-pointer"
          >
            {loading ? "Checking…" : "See my payments"}
          </button>
        </form>
      </div>
    </div>
  );
}
