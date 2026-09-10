"use client";

import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "@/lib/firebase/client";

export async function uploadToStorage(file: File, folder: string): Promise<string> {
  const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_");
  const path = `${folder}/${Date.now()}-${safeName}`;
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, file);
  return getDownloadURL(storageRef);
}

export interface UploadResult {
  url: string | null;
  failed: boolean;
}

/**
 * Same as uploadToStorage, but never throws -- a failed upload (Storage not
 * provisioned, network hiccup, etc.) shouldn't block saving everything else
 * a form submitted alongside it. Callers surface `failed` as a warning and
 * proceed with `url: null` for that field.
 */
export async function tryUploadToStorage(file: File, folder: string): Promise<UploadResult> {
  try {
    const url = await uploadToStorage(file, folder);
    return { url, failed: false };
  } catch (err) {
    console.error(`Upload to ${folder} failed:`, err);
    return { url: null, failed: true };
  }
}
