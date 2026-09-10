"use client";

import { useState, type FormEvent } from "react";
import { useAuth } from "@/lib/firebase/auth-context";
import { LockIcon } from "@/components/icons";
import { Logo } from "@/components/Logo";

export default function LoginPage() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await signIn(email, password);
    } catch {
      setError("Incorrect email or password.");
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center gap-3 mb-8">
          <div className="rounded-full ring-1 ring-border shadow-sm">
            <Logo size={64} />
          </div>
          <div className="text-xl font-extrabold tracking-tight">RiderIQ</div>
          <div className="text-sm font-semibold text-muted">Sign in to manage your bikes</div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-white border border-border rounded-[14px] p-7 flex flex-col gap-4"
        >
          <div>
            <label className="block text-[12.5px] font-bold text-muted uppercase tracking-wide mb-1.5">
              Email
            </label>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@business.com"
              className="w-full font-semibold text-[15px] px-3.5 py-2.5 border border-border-input rounded-lg bg-white focus:outline-none focus:border-[#1f6b45] focus:ring-3 focus:ring-[#1f6b45]/15"
            />
          </div>
          <div>
            <label className="block text-[12.5px] font-bold text-muted uppercase tracking-wide mb-1.5">
              Password
            </label>
            <input
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full font-semibold text-[15px] px-3.5 py-2.5 border border-border-input rounded-lg bg-white focus:outline-none focus:border-[#1f6b45] focus:ring-3 focus:ring-[#1f6b45]/15"
            />
          </div>

          {error && (
            <div className="text-[13px] font-semibold text-[#a3271f] bg-status-flagged-bg rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="mt-1 w-full bg-brand text-cream font-extrabold text-[15px] rounded-[9px] py-3 hover:opacity-90 disabled:opacity-60 transition-opacity cursor-pointer"
          >
            {submitting ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <div className="flex items-center justify-center gap-1.5 mt-5 text-[12.5px] font-semibold text-muted-2">
          <LockIcon size={13} />
          Private, admin-only access
        </div>
      </div>
    </div>
  );
}
