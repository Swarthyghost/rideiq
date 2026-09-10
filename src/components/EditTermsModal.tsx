"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { CloseIcon } from "@/components/icons";
import type { Bike, BikeStatus } from "@/lib/types";

const STATUS_OPTIONS: { value: BikeStatus; label: string }[] = [
  { value: "active", label: "Active" },
  { value: "repossession_flagged", label: "Repossession flagged" },
  { value: "repossessed", label: "Repossessed" },
  { value: "completed", label: "Completed" },
];

export function EditTermsModal({ bike, onClose }: { bike: Bike; onClose: () => void }) {
  const router = useRouter();
  const [bikeModel, setBikeModel] = useState(bike.bikeModel);
  const [plateNumber, setPlateNumber] = useState(bike.plateNumber ?? "");
  const [riderName, setRiderName] = useState(bike.riderName);
  const [riderPhone, setRiderPhone] = useState(bike.riderPhone);
  const [status, setStatus] = useState<BikeStatus>(bike.status);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const response = await fetch(`/api/bikes/${bike.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bikeModel, plateNumber, riderName, riderPhone, status }),
      });
      if (!response.ok) throw new Error("Failed");
      onClose();
      router.refresh();
    } catch {
      setError("Couldn't save changes. Try again.");
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/35" onClick={onClose} />
      <form
        onSubmit={handleSubmit}
        className="relative bg-white rounded-2xl border border-border w-full max-w-md p-6 flex flex-col gap-4 max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between">
          <div className="text-lg font-extrabold">Edit terms</div>
          <button type="button" onClick={onClose} className="text-muted cursor-pointer" aria-label="Close">
            <CloseIcon size={18} />
          </button>
        </div>

        <Field label="Bike / model">
          <input value={bikeModel} onChange={(e) => setBikeModel(e.target.value)} required className={inputClass} />
        </Field>
        <Field label="Plate number">
          <input value={plateNumber} onChange={(e) => setPlateNumber(e.target.value)} className={inputClass} />
        </Field>
        <Field label="Rider name">
          <input value={riderName} onChange={(e) => setRiderName(e.target.value)} required className={inputClass} />
        </Field>
        <Field label="Rider phone">
          <input value={riderPhone} onChange={(e) => setRiderPhone(e.target.value)} required className={inputClass} />
        </Field>
        <Field label="Status">
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as BikeStatus)}
            className={inputClass}
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </Field>

        {error && <div className="text-[13px] font-semibold text-[#a3271f]">{error}</div>}

        <button
          type="submit"
          disabled={saving}
          className="mt-1 w-full bg-brand text-cream font-extrabold text-[15px] rounded-[9px] py-3 hover:opacity-90 disabled:opacity-60 cursor-pointer"
        >
          {saving ? "Saving…" : "Save changes"}
        </button>
      </form>
    </div>
  );
}

const inputClass =
  "w-full font-semibold text-[15px] px-3.5 py-2.5 border border-border-input rounded-lg bg-white focus:outline-none focus:border-[#1f6b45] focus:ring-3 focus:ring-[#1f6b45]/15";

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
