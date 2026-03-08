const AUTH_STORAGE_KEY = "splitbill.session.v1";

export type StoredSession = {
  accountId: string;
  email: string;
  displayName: string;
  preferredCurrency: string;
  emailVerified: boolean;
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
};

function isStoredSession(value: unknown): value is StoredSession {
  if (!value || typeof value !== "object") {
    return false;
  }

  const session = value as Partial<StoredSession>;
  return Boolean(
    session.accountId &&
      session.email &&
      session.displayName &&
      session.preferredCurrency &&
      typeof session.emailVerified === "boolean" &&
      session.accessToken &&
      session.refreshToken &&
      typeof session.expiresAt === "number"
  );
}

function parseSession(raw: string | null): StoredSession | null {
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    return isStoredSession(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function readStoredSession(): StoredSession | null {
  return (
    parseSession(window.localStorage.getItem(AUTH_STORAGE_KEY)) ??
    parseSession(window.sessionStorage.getItem(AUTH_STORAGE_KEY))
  );
}

export function writeStoredSession(session: StoredSession, keepSignedIn: boolean) {
  const storage = keepSignedIn ? window.localStorage : window.sessionStorage;
  const fallbackStorage = keepSignedIn ? window.sessionStorage : window.localStorage;
  storage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
  fallbackStorage.removeItem(AUTH_STORAGE_KEY);
}

export function clearStoredSession() {
  window.localStorage.removeItem(AUTH_STORAGE_KEY);
  window.sessionStorage.removeItem(AUTH_STORAGE_KEY);
}

export function getAccessToken() {
  return readStoredSession()?.accessToken ?? null;
}
