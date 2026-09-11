"use client";

interface SignResponse {
  signature: string;
  timestamp: number;
  apiKey: string;
  cloudName: string;
  folder: string;
}

async function getSignature(folder: string): Promise<SignResponse> {
  const response = await fetch("/api/cloudinary/sign", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ folder }),
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error ?? "Failed to sign upload");
  }
  return response.json();
}

export async function uploadToCloudinary(file: File, folder: string): Promise<string> {
  const { signature, timestamp, apiKey, cloudName } = await getSignature(folder);

  const formData = new FormData();
  formData.append("file", file);
  formData.append("api_key", apiKey);
  formData.append("timestamp", String(timestamp));
  formData.append("signature", signature);
  formData.append("folder", folder);

  const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`, {
    method: "POST",
    body: formData,
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error?.message ?? "Upload failed");
  return data.secure_url as string;
}

export interface UploadResult {
  url: string | null;
  failed: boolean;
}

/**
 * Same as uploadToCloudinary, but never throws -- a failed upload (bad
 * config, network hiccup, etc.) shouldn't block saving everything else a
 * form submitted alongside it. Callers surface `failed` as a warning and
 * proceed with `url: null` for that field.
 */
export async function tryUploadToCloudinary(file: File, folder: string): Promise<UploadResult> {
  try {
    const url = await uploadToCloudinary(file, folder);
    return { url, failed: false };
  } catch (err) {
    console.error(`Upload to ${folder} failed:`, err);
    return { url: null, failed: true };
  }
}
