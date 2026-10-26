"use client";

import { useEffect, useState, type FormEvent } from "react";
import { CloseIcon } from "@/components/icons";
import { RiderStatementView } from "@/components/RiderStatementView";
import type { StatementData } from "@/lib/statement-data";

interface Loaded {
  statement: StatementData;
  pdfUrl: string;
  filename: string;
}

function pdfObjectUrl(base64: string): string {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return URL.createObjectURL(new Blob([bytes], { type: "application/pdf" }));
}

export function RiderStatementModal({ token, onClose }: { token: string; onClose: () => void }) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState<Loaded | null>(null);

  const pdfUrl = loaded?.pdfUrl ?? null;
  useEffect(() => {
    return () => {
      if (pdfUrl) URL.revokeObjectURL(pdfUrl);
    };
  }, [pdfUrl]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (pin.length < 4 || loading) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/rider/${token}/statement`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error ?? "Something went wrong. Please try again.");
      setLoaded({
        statement: data.statement,
        pdfUrl: pdfObjectUrl(data.pdf.base64),
        filename: data.pdf.filename,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      setPin("");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4">
      <div className="absolute inset-0 bg-black/35" onClick={onClose} />
      <div className="relative bg-white w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl border border-border flex flex-col max-h-[92dvh] sm:max-h-[88vh] overflow-hidden">
        <div className="flex items-center justify-between px-5 pt-5 pb-3 flex-shrink-0">
          <div className="text-lg font-extrabold">Account statement</div>
          <button onClick={onClose} className="text-muted cursor-pointer" aria-label="Close">
            <CloseIcon size={18} />
          </button>
        </div>

        {loaded ? (
          <>
            <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-5 pb-4">
              <RiderStatementView data={loaded.statement} />
            </div>
            <div className="flex-shrink-0 border-t border-hairline bg-white px-5 py-3.5 flex items-center gap-3">
              <a
                href={loaded.pdfUrl}
                download={loaded.filename}
                className="flex-1 text-center bg-brand text-cream font-extrabold text-[15px] rounded-[9px] py-3 hover:opacity-90"
              >
                Download PDF
              </a>
              <button
                onClick={onClose}
                className="text-muted font-bold text-[14px] cursor-pointer px-2"
              >
                Close
              </button>
            </div>
          </>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4 px-5 pb-6">
            <p className="text-[13.5px] font-semibold text-muted">
              Enter the last 4 digits of your phone number to see your statement.
            </p>
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
              {loading ? "Preparing…" : "View statement"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
