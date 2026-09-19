"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { OwnerProfile } from "@/lib/types";

const inputClass =
  "w-full font-semibold text-[15px] px-3.5 py-2.5 border border-border-input rounded-lg bg-white focus:outline-none focus:border-[#1f6b45] focus:ring-3 focus:ring-[#1f6b45]/15";

export function OwnerProfileForm({ profile, email }: { profile: OwnerProfile; email: string }) {
  const router = useRouter();
  const [firstName, setFirstName] = useState(profile.firstName);
  const [lastName, setLastName] = useState(profile.lastName);
  const [phone, setPhone] = useState(profile.phone);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setMessage(null);
    if (!firstName.trim() || !lastName.trim()) {
      setMessage({ ok: false, text: "First and last name are required." });
      return;
    }
    setSaving(true);
    try {
      const response = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ firstName, lastName, phone }),
      });
      if (!response.ok) throw new Error("Failed");
      setMessage({ ok: true, text: "Profile saved." });
      router.refresh();
    } catch {
      setMessage({ ok: false, text: "Couldn't save your profile. Try again." });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white border border-border rounded-[14px] p-5 sm:p-6 mb-8">
      <div className="text-[15px] font-extrabold mb-4">Your details</div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="First name">
          <input value={firstName} onChange={(e) => setFirstName(e.target.value)} className={inputClass} />
        </Field>
        <Field label="Last name">
          <input value={lastName} onChange={(e) => setLastName(e.target.value)} className={inputClass} />
        </Field>
        <Field label="Phone">
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="e.g. 024 123 4567"
            className={inputClass}
          />
        </Field>
        <Field label="Email">
          <input value={email} readOnly className={`${inputClass} bg-panel text-muted cursor-not-allowed`} />
        </Field>
      </div>
      {message && (
        <div
          className="text-[13px] font-semibold mt-4"
          style={{ color: message.ok ? "#1f6b45" : "#a3271f" }}
        >
          {message.text}
        </div>
      )}
      <button
        type="submit"
        disabled={saving}
        className="mt-4 bg-brand text-cream font-extrabold text-[14px] rounded-[9px] px-6 py-2.5 hover:opacity-90 disabled:opacity-60 cursor-pointer"
      >
        {saving ? "Saving…" : "Save details"}
      </button>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[12.5px] font-bold text-muted uppercase tracking-wide mb-1.5">
        {label}
      </label>
      {children}
    </div>
  );
}
