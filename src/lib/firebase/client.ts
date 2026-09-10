import { getApps, initializeApp, type FirebaseOptions } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getStorage, type FirebaseStorage } from "firebase/storage";

const firebaseConfig: FirebaseOptions = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

export const firebaseApp = getApps()[0] ?? initializeApp(firebaseConfig);

// getAuth/getFirestore/getStorage validate the config (e.g. throw
// auth/invalid-api-key) the moment they're called. Next.js statically
// prerenders /login at build time, which imports this module — so calling
// them eagerly here means a build with unset NEXT_PUBLIC_FIREBASE_* env vars
// (a misconfigured Vercel project, a fresh checkout with no .env.local)
// crashes the whole build instead of failing at runtime, in the browser,
// where it's actually actionable. Deferring the call until first use avoids
// that class of failure without changing how callers import `auth`/`db`/`storage`.
function lazy<T extends object>(factory: () => T): T {
  let instance: T | undefined;
  return new Proxy({} as T, {
    get(_target, prop, receiver) {
      if (!instance) instance = factory();
      return Reflect.get(instance as object, prop, receiver);
    },
  });
}

export const auth: Auth = lazy(() => getAuth(firebaseApp));
export const db: Firestore = lazy(() => getFirestore(firebaseApp));
export const storage: FirebaseStorage = lazy(() => getStorage(firebaseApp));
