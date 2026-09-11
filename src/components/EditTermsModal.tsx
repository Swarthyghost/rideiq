"use client";

import { useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { CloseIcon, CameraIcon, UploadIcon, CheckCircleIcon } from "@/components/icons";
import { Avatar } from "@/components/Avatar";
import { tryUploadToCloudinary } from "@/lib/cloudinary/upload";
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
  const [weeklyAmount, setWeeklyAmount] = useState(String(bike.weeklyAmount));
  const [totalValue, setTotalValue] = useState(String(bike.totalValue));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [riderPhotoFile, setRiderPhotoFile] = useState<File | null>(null);
  const [riderPhotoPreview, setRiderPhotoPreview] = useState<string | null>(bike.riderPhotoUrl);
  const [idDocFile, setIdDocFile] = useState<File | null>(null);
  const [contractDocFile, setContractDocFile] = useState<File | null>(null);

  const photoInputRef = useRef<HTMLInputElement>(null);
  const idInputRef = useRef<HTMLInputElement>(null);
  const contractInputRef = useRef<HTMLInputElement>(null);

  function handlePhotoChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setRiderPhotoFile(file);
    setRiderPhotoPreview(URL.createObjectURL(file));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    const weekly = Number(weeklyAmount);
    const total = Number(totalValue);
    if (!(weekly > 0)) {
      setError("Weekly payment must be greater than zero.");
      return;
    }
    if (!(total > 0)) {
      setError("Total balance must be greater than zero.");
      return;
    }

    setSaving(true);
    try {
      const folder = `bikes/${bike.id}`;
      const [photoResult, idResult, contractResult] = await Promise.all([
        riderPhotoFile ? tryUploadToCloudinary(riderPhotoFile, `${folder}/rider-photo`) : Promise.resolve({ url: undefined, failed: false }),
        idDocFile ? tryUploadToCloudinary(idDocFile, `${folder}/id-doc`) : Promise.resolve({ url: undefined, failed: false }),
        contractDocFile ? tryUploadToCloudinary(contractDocFile, `${folder}/contract`) : Promise.resolve({ url: undefined, failed: false }),
      ]);
      // A failed upload keeps the field untouched (undefined) rather than
      // wiping out whatever document/photo was already on file.
      const riderPhotoUrl = photoResult.failed ? undefined : photoResult.url;
      const idDocUrl = idResult.failed ? undefined : idResult.url;
      const contractDocUrl = contractResult.failed ? undefined : contractResult.url;

      const failedUploads = [
        photoResult.failed && "rider photo",
        idResult.failed && "government ID",
        contractResult.failed && "signed contract",
      ].filter(Boolean);

      const response = await fetch(`/api/bikes/${bike.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bikeModel,
          plateNumber,
          riderName,
          riderPhone,
          status,
          weeklyAmount: weekly,
          totalValue: total,
          ...(riderPhotoUrl !== undefined ? { riderPhotoUrl } : {}),
          ...(idDocUrl !== undefined ? { idDocUrl } : {}),
          ...(contractDocUrl !== undefined ? { contractDocUrl } : {}),
        }),
      });
      if (!response.ok) throw new Error("Failed");

      if (failedUploads.length > 0) {
        alert(
          `Changes saved, but the ${failedUploads.join(" and ")} couldn't be uploaded. Try again from here later.`
        );
      }
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
        className="relative bg-white rounded-2xl border border-border w-full max-w-lg p-6 flex flex-col gap-4 max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between">
          <div className="text-lg font-extrabold">Edit rider profile</div>
          <button type="button" onClick={onClose} className="text-muted cursor-pointer" aria-label="Close">
            <CloseIcon size={18} />
          </button>
        </div>

        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => photoInputRef.current?.click()}
            className="relative rounded-full cursor-pointer flex-shrink-0"
          >
            {riderPhotoPreview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={riderPhotoPreview}
                alt={riderName}
                className="w-[68px] h-[68px] rounded-full object-cover"
              />
            ) : (
              <Avatar name={riderName || "?"} size={68} />
            )}
            <span className="absolute -bottom-1 -right-1 bg-brand text-cream rounded-full w-6 h-6 flex items-center justify-center border-2 border-white">
              <CameraIcon size={12} />
            </span>
          </button>
          <input
            ref={photoInputRef}
            type="file"
            accept="image/*"
            onChange={handlePhotoChange}
            className="hidden"
          />
          <div>
            <div className="text-sm font-bold">Rider photo</div>
            <button
              type="button"
              onClick={() => photoInputRef.current?.click()}
              className="text-[13px] font-bold text-[#1f6b45] hover:text-[#14532d] mt-1 cursor-pointer"
            >
              Change photo
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Bike / model">
            <input value={bikeModel} onChange={(e) => setBikeModel(e.target.value)} required className={inputClass} />
          </Field>
          <Field label="Plate number">
            <input value={plateNumber} onChange={(e) => setPlateNumber(e.target.value)} className={inputClass} />
          </Field>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Rider name">
            <input value={riderName} onChange={(e) => setRiderName(e.target.value)} required className={inputClass} />
          </Field>
          <Field label="Rider phone">
            <input value={riderPhone} onChange={(e) => setRiderPhone(e.target.value)} required className={inputClass} />
          </Field>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Weekly payment (GHS)">
            <input
              type="number"
              min={1}
              value={weeklyAmount}
              onChange={(e) => setWeeklyAmount(e.target.value)}
              required
              className={inputClass}
            />
          </Field>
          <Field label="Total balance (GHS)">
            <input
              type="number"
              min={1}
              value={totalValue}
              onChange={(e) => setTotalValue(e.target.value)}
              required
              className={inputClass}
            />
          </Field>
        </div>
        <p className="text-[12px] text-muted font-semibold -mt-2">
          Changing the weekly payment updates every week that hasn&apos;t been paid yet — weeks already paid keep their original amount.
        </p>

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

        <div className="border-t border-hairline pt-4">
          <div className="text-[14.5px] font-extrabold mb-3">Documents</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <DocSlot
              label="Government ID"
              file={idDocFile}
              existingUrl={bike.idDocUrl}
              inputRef={idInputRef}
              onChange={setIdDocFile}
            />
            <DocSlot
              label="Signed contract"
              file={contractDocFile}
              existingUrl={bike.contractDocUrl}
              inputRef={contractInputRef}
              onChange={setContractDocFile}
            />
          </div>
        </div>

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

function DocSlot({
  label,
  file,
  existingUrl,
  inputRef,
  onChange,
}: {
  label: string;
  file: File | null;
  existingUrl: string | null;
  inputRef: React.RefObject<HTMLInputElement | null>;
  onChange: (file: File | null) => void;
}) {
  const hasDoc = Boolean(file || existingUrl);
  return (
    <div className="border-2 border-dashed border-border-input rounded-[10px] px-3.5 py-4 text-center bg-bg">
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,application/pdf"
        onChange={(e) => onChange(e.target.files?.[0] ?? null)}
        className="hidden"
      />
      {hasDoc ? (
        <CheckCircleIcon size={20} className="mx-auto text-[#1f6b45]" />
      ) : (
        <UploadIcon size={20} className="mx-auto text-muted-2" />
      )}
      <div className="text-[13px] font-bold mt-2">{label}</div>
      <div className="text-[11.5px] text-muted-2 font-semibold mt-0.5 truncate">
        {file ? file.name : existingUrl ? "On file" : "No file uploaded"}
      </div>
      <div className="flex items-center justify-center gap-3 mt-2">
        {existingUrl && !file && (
          <a
            href={existingUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[12px] font-bold text-[#1f6b45] hover:text-[#14532d]"
          >
            View
          </a>
        )}
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="text-[12px] font-bold text-[#1f6b45] hover:text-[#14532d] cursor-pointer"
        >
          {hasDoc ? "Replace" : "Upload"}
        </button>
      </div>
    </div>
  );
}
