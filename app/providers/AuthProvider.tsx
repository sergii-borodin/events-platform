"use client";

import { createContext, useContext, useEffect, useState } from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  signOut,
  User,
} from "firebase/auth";
import { auth } from "@/lib/firebase/client";
import posthog from "posthog-js";

type AuthContextType = {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (
    email: string,
    password: string,
    firstName: string,
    lastName: string,
  ) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | null>(null);

async function establishServerSession(
  user: User,
  names?: { firstName: string; lastName: string },
) {
  const idToken = await user.getIdToken();
  await fetch("/api/auth/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      idToken,
      ...(names
        ? { firstName: names.firstName, lastName: names.lastName }
        : {}),
    }),
  });
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    return onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        await establishServerSession(firebaseUser);
        posthog.identify(firebaseUser.uid, { email: firebaseUser.email });
      }
      setLoading(false);
    });
  }, []);

  const login = async (email: string, password: string) => {
    const { user } = await signInWithEmailAndPassword(auth, email, password);
    await establishServerSession(user);
  };

  const signup = async (
    email: string,
    password: string,
    firstName: string,
    lastName: string,
  ) => {
    const normalizedFirstName = firstName.trim();
    const normalizedLastName = lastName.trim();
    const { user } = await createUserWithEmailAndPassword(
      auth,
      email,
      password,
    );
    await updateProfile(user, {
      displayName: `${normalizedFirstName} ${normalizedLastName}`,
    });
    setUser(auth.currentUser);
    await establishServerSession(user, {
      firstName: normalizedFirstName,
      lastName: normalizedLastName,
    });
  };

  const logout = async () => {
    await fetch("/api/auth/session", { method: "DELETE" });
    await signOut(auth);
    posthog.reset();
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
