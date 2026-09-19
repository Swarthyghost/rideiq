"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import {
  onAuthStateChanged,
  signInWithCustomToken,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  type User,
  type UserCredential,
} from "firebase/auth";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/firebase/client";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signInDemo: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    return onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
  }, []);

  async function startSession(credential: UserCredential) {
    const idToken = await credential.user.getIdToken();
    const response = await fetch("/api/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken }),
    });
    if (!response.ok) {
      await firebaseSignOut(auth);
      throw new Error("Could not start a session.");
    }
    router.push("/");
    router.refresh();
  }

  async function signIn(email: string, password: string) {
    await startSession(await signInWithEmailAndPassword(auth, email, password));
  }

  async function signInDemo() {
    const response = await fetch("/api/demo/login", { method: "POST" });
    if (!response.ok) throw new Error("Could not start the demo.");
    const { token } = await response.json();
    await startSession(await signInWithCustomToken(auth, token));
  }

  async function signOut() {
    await fetch("/api/session", { method: "DELETE" });
    await firebaseSignOut(auth);
    router.push("/login");
    router.refresh();
  }

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signInDemo, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
