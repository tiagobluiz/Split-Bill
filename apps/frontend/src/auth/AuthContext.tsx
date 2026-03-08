/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useMemo, useState } from "react";
import { ResponseError } from "@contracts/client";
import { authApi } from "../api/contractsClient";
import {
  clearStoredSession,
  readStoredSession as readStoredAuthSession,
  writeStoredSession
} from "./sessionStore";

export type AuthSession = {
  accountId: string;
  email: string;
  displayName: string;
  preferredCurrency: string;
  emailVerified: boolean;
};

export type SignInPayload = {
  email: string;
  password: string;
  keepSignedIn: boolean;
};

type AuthContextValue = {
  session: AuthSession | null;
  signIn: (payload: SignInPayload) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function readStoredSession(): AuthSession | null {
  const stored = readStoredAuthSession();
  if (!stored) {
    return null;
  }
  return {
    accountId: stored.accountId,
    email: stored.email,
    displayName: stored.displayName,
    preferredCurrency: stored.preferredCurrency,
    emailVerified: stored.emailVerified
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(() => readStoredSession());

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      signIn: async ({ email, password, keepSignedIn }: SignInPayload) => {
        try {
          const response = await authApi.authLoginPost({
            loginRequest: {
              email: email.trim().toLowerCase(),
              password
            }
          });

          const nextSession = {
            accountId: response.account.id,
            email: response.account.email,
            displayName: response.account.name,
            preferredCurrency: response.account.preferredCurrency,
            emailVerified: response.account.emailVerified
          };

          writeStoredSession(
            {
              ...nextSession,
              accessToken: response.tokens.accessToken,
              refreshToken: response.tokens.refreshToken,
              expiresAt: Date.now() + response.tokens.expiresInSeconds * 1000
            },
            keepSignedIn
          );

          setSession(nextSession);
        } catch (error) {
          if (error instanceof ResponseError) {
            const payload = (await error.response.json().catch(() => null)) as
              | { message?: string }
              | null;
            throw new Error(payload?.message ?? "Could not sign in.");
          }
          throw error;
        }
      },
      signOut: async () => {
        try {
          await authApi.authLogoutPost();
        } catch {
          // Best-effort logout: clear local session regardless of API outcome.
        }
        clearStoredSession();
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
