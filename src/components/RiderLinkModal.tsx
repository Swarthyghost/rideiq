"use client";

import { useEffect, useState } from "react";
import { CloseIcon } from "@/components/icons";
import type { Bike } from "@/lib/types";

export function RiderLinkModal({ bike, onClose }: { bike: Bike; onClose: () => void }) {
  const [token, setToken] = useState<string | null>(null);
  const [pin, setPin] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);

  function applyResult(data: { token: string; pin: string | null }) {
    setToken(data.token);
    setPin(data.pin);
    setCopied(false);
  }

  async function request(regenerate: boolean) {
    const response = await fetch(`/api/bikes/${bike.id}/rider-link`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ regenerate }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error ?? "Failed");
    return data as { token: string; pin: string | null };
  }

  useEffect(() => {
    let cancelled = false;
    request(false)
      .then((data) => {
        if (!cancelled) applyResult(data);
      })
      .catch(() => {
        if (!cancelled) setError("Couldn't get the link. Try again.");
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bike.id]);

  async function regenerate() {
    setBusy(true);
    setError(null);
    try {
      applyResult(await request(true));
    } catch {
      setError("Couldn't make a new link. Try again.");
    } finally {
      setBusy(false);
    }
  }

  const url = token ? `${window.location.origin}/r/${token}` : "";
  const shareText = `Hello ${bike.riderName}, this is your RiderIQ payment page: ${url}\nYour PIN is the last 4 digits of your phone number.`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      setError("Couldn't copy. Select the link and copy it by hand.");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/35" onClick={onClose} />
      <div className="relative bg-white rounded-2xl border border-border w-full max-w-md p-6 flex flex-col gap-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <div className="text-lg font-extrabold">{bike.riderName}&apos;s rider link</div>
          <button onClick={onClose} className="text-muted cursor-pointer" aria-label="Close">
            <CloseIcon size={18} />
          </button>
        </div>

        <p className="text-[13px] font-semibold text-muted">
          Send this link to the rider. They open it, enter their PIN, see their progress and tap &quot;I&apos;ve
          paid&quot; after sending money. You approve it from your dashboard.
        </p>

        {token ? (
          <>
            <input
              readOnly
              value={url}
              onFocus={(e) => e.currentTarget.select()}
              className="w-full text-[13px] font-semibold px-3 py-2.5 border border-border-input rounded-lg bg-bg"
            />
            <div className="flex flex-wrap items-center gap-2.5">
              <button
                onClick={copy}
                className="bg-brand text-cream font-bold text-[13.5px] rounded-lg px-4 py-2.5 hover:opacity-90 cursor-pointer"
              >
                {copied ? "Copied" : "Copy link"}
              </button>
              <a
                href={`https://wa.me/?text=${encodeURIComponent(shareText)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-white border border-border-input text-[#3a3630] font-bold text-[13.5px] rounded-lg px-4 py-2.5 hover:bg-panel"
              >
                Send on WhatsApp
              </a>
            </div>

            <div className="bg-panel rounded-lg px-4 py-3 text-[13px] font-semibold">
              {pin ? (
                <>
                  Rider&apos;s PIN: the last 4 digits of their phone number ({" "}
                  <span className="font-extrabold">{pin}</span> ).
                </>
              ) : (
                <span className="text-[#a3271f]">
                  This rider has no usable phone number, so they can&apos;t get in. Add one under Edit terms first.
                </span>
              )}
            </div>

            <button
              onClick={() => {
                if (window.confirm("Make a new link? The old link will stop working straight away.")) regenerate();
              }}
              disabled={busy}
              className="text-[12.5px] font-bold text-muted underline cursor-pointer text-left disabled:opacity-50"
            >
              Make a new link (the old one stops working)
            </button>
          </>
        ) : (
          !error && <div className="text-[13px] font-semibold text-muted">Getting the link…</div>
        )}

        {error && <div className="text-[13px] font-semibold text-[#a3271f]">{error}</div>}
      </div>
    </div>
  );
}
