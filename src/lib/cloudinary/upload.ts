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

/**
 * fetch() has no reliable cross-browser way to report upload progress for
 * a request body, so this uses XMLHttpRequest specifically to drive
 * onProgress (0-100) while the file is in flight.
 */
export async function uploadToCloudinary(
  file: File,
  folder: string,
  onProgress?: (percent: number) => void
): Promise<string> {
  const { signature, timestamp, apiKey, cloudName } = await getSignature(folder);

  const formData = new FormData();
  formData.append("file", file);
  formData.append("api_key", apiKey);
  formData.append("timestamp", String(timestamp));
  formData.append("signature", signature);
  formData.append("folder", folder);

  return new Promise<string>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`);

    xhr.upload.addEventListener("progress", (event) => {
      if (event.lengthComputable && onProgress) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    });

    xhr.addEventListener("load", () => {
      let data: { secure_url?: string; error?: { message?: string } } = {};
      try {
        data = JSON.parse(xhr.responseText);
      } catch {
        // fall through to the status check below with an empty payload
      }
      if (xhr.status >= 200 && xhr.status < 300 && data.secure_url) {
        onProgress?.(100);
        resolve(data.secure_url);
      } else {
        reject(new Error(data.error?.message ?? "Upload failed"));
      }
    });

    xhr.addEventListener("error", () => reject(new Error("Network error during upload")));
    xhr.send(formData);
  });
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
export async function tryUploadToCloudinary(
  file: File,
  folder: string,
  onProgress?: (percent: number) => void
): Promise<UploadResult> {
  try {
    const url = await uploadToCloudinary(file, folder, onProgress);
    return { url, failed: false };
  } catch (err) {
    console.error(`Upload to ${folder} failed:`, err);
    return { url: null, failed: true };
  }
}
