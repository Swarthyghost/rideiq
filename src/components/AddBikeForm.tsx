"use client";

import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { tryUploadToCloudinary } from "@/lib/cloudinary/upload";
import { toISODate } from "@/lib/format";
import { CameraIcon, UploadIcon } from "@/components/icons";

const inputClass =
  "w-full font-semibold text-[15px] px-3.5 py-2.5 border border-border-input rounded-lg bg-white focus:outline-none focus:border-[#1f6b45] focus:ring-3 focus:ring-[#1f6b45]/15";

export function AddBikeForm() {
  const router = useRouter();

  const [bikeModel, setBikeModel] = useState("");
  const [plateNumber, setPlateNumber] = useState("");
  const [riderName, setRiderName] = useState("");
  const [riderPhone, setRiderPhone] = useState("");
  const [startDate, setStartDate] = useState(toISODate(new Date()));
  const [weeklyAmount, setWeeklyAmount] = useState("400");
  const [numPayments, setNumPayments] = useState("50");

  const [riderPhotoFile, setRiderPhotoFile] = useState<File | null>(null);
  const [riderPhotoPreview, setRiderPhotoPreview] = useState<string | null>(null);
  const [idDocFile, setIdDocFile] = useState<File | null>(null);
  const [contractDocFile, setContractDocFile] = useState<File | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const photoInputRef = useRef<HTMLInputElement>(null);
  const idInputRef = useRef<HTMLInputElement>(null);
  const contractInputRef = useRef<HTMLInputElement>(null);

  const total = (Number(weeklyAmount) || 0) * (Number(numPayments) || 0);

  function handlePhotoChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setRiderPhotoFile(file);
    setRiderPhotoPreview(URL.createObjectURL(file));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!bikeModel.trim() || !riderName.trim() || !riderPhone.trim() || !startDate) {
      setError("Please fill in all required fields.");
      return;
    }
    if (!(Number(weeklyAmount) > 0) || !(Number(numPayments) > 0)) {
      setError("Weekly payment and number of payments must be greater than zero.");
      return;
    }

    setSubmitting(true);
    try {
      const folder = `bikes/${Date.now()}`;
      const [photoResult, idResult, contractResult] = await Promise.all([
        riderPhotoFile ? tryUploadToCloudinary(riderPhotoFile, `${folder}/rider-photo`) : Promise.resolve({ url: null, failed: false }),
        idDocFile ? tryUploadToCloudinary(idDocFile, `${folder}/id-doc`) : Promise.resolve({ url: null, failed: false }),
        contractDocFile ? tryUploadToCloudinary(contractDocFile, `${folder}/contract`) : Promise.resolve({ url: null, failed: false }),
      ]);
      const riderPhotoUrl = photoResult.url;
      const idDocUrl = idResult.url;
      const contractDocUrl = contractResult.url;

      const failedUploads = [
        photoResult.failed && "rider photo",
        idResult.failed && "government ID",
        contractResult.failed && "signed contract",
      ].filter(Boolean);

      const response = await fetch("/api/bikes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bikeModel: bikeModel.trim(),
          plateNumber: plateNumber.trim(),
          riderName: riderName.trim(),
          riderPhone: riderPhone.trim(),
          startDate,
          weeklyAmount: Number(weeklyAmount),
          numPayments: Number(numPayments),
          riderPhotoUrl,
          idDocUrl,
          contractDocUrl,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Failed to save bike");

      if (failedUploads.length > 0) {
        alert(
          `Bike saved, but the ${failedUploads.join(" and ")} couldn't be uploaded. You can add ${failedUploads.length > 1 ? "them" : "it"} later from the bike's profile.`
        );
      }
      router.push(`/bikes/${data.bikeId}`);
    } catch {
      setError("Couldn't save this bike. Check the details and try again.");
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-[560px] mx-auto px-4 sm:px-6 py-8 sm:py-10 pb-16 w-full">
      <h1 className="text-xl font-extrabold mb-1.5">Add a bike</h1>
      <p className="text-sm text-muted font-semibold mb-7">
        The full weekly schedule is generated automatically from these details.
      </p>

      <form onSubmit={handleSubmit} className="bg-white border border-border rounded-[14px] p-6 sm:p-6.5 flex flex-col">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Bike / model">
            <input
              value={bikeModel}
              onChange={(e) => setBikeModel(e.target.value)}
              placeholder="e.g. Honda Ace 110"
              className={inputClass}
            />
          </Field>
          <Field label="Plate number">
            <input
              value={plateNumber}
              onChange={(e) => setPlateNumber(e.target.value)}
              placeholder="Optional"
              className={inputClass}
            />
          </Field>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4.5">
          <Field label="Rider name">
            <input
              value={riderName}
              onChange={(e) => setRiderName(e.target.value)}
              placeholder="e.g. Nana Kwame"
              className={inputClass}
            />
          </Field>
          <Field label="Rider phone">
            <input
              value={riderPhone}
              onChange={(e) => setRiderPhone(e.target.value)}
              placeholder="e.g. 024 123 4567"
              className={inputClass}
            />
          </Field>
        </div>

        <div className="flex items-center gap-4 py-5">
          <button
            type="button"
            onClick={() => photoInputRef.current?.click()}
            className="w-[68px] h-[68px] rounded-full border-2 border-dashed border-border-input flex items-center justify-center flex-shrink-0 bg-bg cursor-pointer overflow-hidden"
          >
            {riderPhotoPreview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={riderPhotoPreview} alt="Rider" className="w-full h-full object-cover" />
            ) : (
              <CameraIcon size={22} className="text-muted-2" />
            )}
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
            <div className="text-[12.5px] text-muted font-semibold mt-0.5">
              Shown next to their name on the dashboard.
            </div>
            <button
              type="button"
              onClick={() => photoInputRef.current?.click()}
              className="text-[13px] font-bold text-[#1f6b45] hover:text-[#14532d] mt-1.5 cursor-pointer"
            >
              Upload photo
            </button>
          </div>
        </div>

        <Field label="Contract start date">
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className={inputClass}
          />
        </Field>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4.5">
          <Field label="Weekly payment (GHS)">
            <input
              type="number"
              min={1}
              value={weeklyAmount}
              onChange={(e) => setWeeklyAmount(e.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label="Number of weekly payments">
            <input
              type="number"
              min={1}
              value={numPayments}
              onChange={(e) => setNumPayments(e.target.value)}
              className={inputClass}
            />
          </Field>
        </div>

        <div className="bg-panel rounded-[10px] px-4.5 py-4 flex items-center justify-between my-5">
          <span className="text-[13.5px] font-bold text-muted">Total contract value</span>
          <span className="text-xl font-extrabold text-[#1f6b45]">
            GHS {total.toLocaleString("en-US")}
          </span>
        </div>

        <div className="border-t border-hairline pt-5.5 mb-4">
          <div className="text-[14.5px] font-extrabold mb-0.5">Documents</div>
          <div className="text-[12.5px] text-muted font-semibold">
            Stored securely with this bike&apos;s record, alongside the signed contract.
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6.5">
          <Dropzone
            label="Government ID"
            file={idDocFile}
            inputRef={idInputRef}
            onChange={(f) => setIdDocFile(f)}
          />
          <Dropzone
            label="Signed contract"
            file={contractDocFile}
            inputRef={contractInputRef}
            onChange={(f) => setContractDocFile(f)}
          />
        </div>

        {error && (
          <div className="text-[13px] font-semibold text-[#a3271f] bg-status-flagged-bg rounded-lg px-3 py-2 mb-4">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-brand text-cream font-extrabold text-[15px] rounded-[9px] py-3.5 hover:opacity-90 disabled:opacity-60 cursor-pointer transition-opacity"
        >
          {submitting ? "Saving…" : "Save bike & generate schedule"}
        </button>
      </form>
    </div>
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

function Dropzone({
  label,
  file,
  inputRef,
  onChange,
}: {
  label: string;
  file: File | null;
  inputRef: React.RefObject<HTMLInputElement | null>;
  onChange: (file: File | null) => void;
}) {
  // No server URL exists yet at this point (the bike hasn't been created),
  // so "View" previews the picked file locally via an object URL.
  const previewUrl = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  return (
    <div className="border-2 border-dashed border-border-input rounded-[10px] px-3.5 py-5 text-center bg-bg hover:border-[#1f6b45]/40">
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,application/pdf"
        onChange={(e) => onChange(e.target.files?.[0] ?? null)}
        className="hidden"
      />
      <button type="button" onClick={() => inputRef.current?.click()} className="w-full cursor-pointer">
        <UploadIcon size={22} className="mx-auto text-muted-2" />
        <div className="text-[13px] font-bold mt-2.5">{label}</div>
        <div className="text-[11.5px] text-muted-2 font-semibold mt-0.5 truncate">
          {file ? file.name : "PNG, JPG or PDF"}
        </div>
      </button>
      {previewUrl && (
        <a
          href={previewUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block text-[12px] font-bold text-[#1f6b45] hover:text-[#14532d] mt-2"
        >
          View
        </a>
      )}
    </div>
  );
}
