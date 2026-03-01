/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useMemo, useState } from "react";

const AUTH_STORAGE_KEY = "splitbill.session.v1";

export type AuthSession = {
  email: string;
  displayName: string;
};

export type SignInPayload = {
  email: string;
  password: string;
  keepSignedIn: boolean;
};

type AuthContextValue = {
  session: AuthSession | null;
  signIn: (payload: SignInPayload) => void;
  signOut: () => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function readStoredSession(): AuthSession | null {
  const raw =
    window.localStorage.getItem(AUTH_STORAGE_KEY) ??
    window.sessionStorage.getItem(AUTH_STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as AuthSession;
    if (!parsed.email || !parsed.displayName) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(() => readStoredSession());

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      signIn: ({ email, password, keepSignedIn }: SignInPayload) => {
        // Mock auth for SB-016. Replace with API credential validation in auth implementation issue.
        void password;
        const normalized = email.trim().toLowerCase();
        const displayName = normalized.split("@")[0] || "Member";
        const nextSession = { email: normalized, displayName };
        const storage = keepSignedIn ? window.localStorage : window.sessionStorage;
        const fallbackStorage = keepSignedIn ? window.sessionStorage : window.localStorage;
        storage.setItem(AUTH_STORAGE_KEY, JSON.stringify(nextSession));
        fallbackStorage.removeItem(AUTH_STORAGE_KEY);
        setSession(nextSession);
      },
      signOut: () => {
        window.localStorage.removeItem(AUTH_STORAGE_KEY);
        window.sessionStorage.removeItem(AUTH_STORAGE_KEY);
        setSession(null);
      }
    }),
    [session]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
