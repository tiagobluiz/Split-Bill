import { ThemeProvider } from "@mui/material";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import App from "./App";
import { AuthProvider } from "./auth/AuthContext";
import { appTheme } from "./theme";

const SESSION_STORAGE_KEY = "splitbill.session.v1";
const fetchEventsMock = vi.fn();

vi.mock("./events/eventsService", () => ({
  fetchEvents: () => fetchEventsMock(),
  createEvent: vi.fn(),
  fetchEventDetails: vi.fn(),
  addEventPerson: vi.fn(),
  updateEventSettings: vi.fn(),
  apiErrorMessage: async (_error: unknown, fallback: string) => fallback
}));

function renderApp(pathname: string) {
  return render(
    <ThemeProvider theme={appTheme}>
      <MemoryRouter initialEntries={[pathname]}>
        <AuthProvider>
          <App />
        </AuthProvider>
      </MemoryRouter>
    </ThemeProvider>
  );
}

describe("App routing and guards", () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
    fetchEventsMock.mockResolvedValue([]);
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("redirects unauthenticated users from protected routes to sign in", async () => {
    renderApp("/app/dashboard");

    expect(await screen.findByRole("heading", { name: "Sign in" })).toBeInTheDocument();
    expect(screen.getByText("Access your events and split history.")).toBeInTheDocument();
  });

  it("shows auth-first landing copy for guests", () => {
    renderApp("/");

    expect(screen.getAllByRole("link", { name: "Sign in" }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("link", { name: "Create account" }).length).toBeGreaterThan(0);
    expect(screen.getByText(/Sign in to see your events and history\./)).toBeInTheDocument();
  });

  it("redirects authenticated users away from public auth routes", async () => {
    window.localStorage.setItem(
      SESSION_STORAGE_KEY,
      JSON.stringify({
        accountId: "acc-1",
        email: "member@splitbill.test",
        displayName: "member",
        preferredCurrency: "EUR",
        emailVerified: true,
        accessToken: "token",
        refreshToken: "refresh",
        expiresAt: Date.now() + 3600_000
      })
    );

    renderApp("/sign-in");

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Your events" })).toBeInTheDocument();
    });
  });

  it("redirects /app/events to dashboard for authenticated users", async () => {
    window.localStorage.setItem(
      SESSION_STORAGE_KEY,
      JSON.stringify({
        accountId: "acc-1",
        email: "member@splitbill.test",
        displayName: "member",
        preferredCurrency: "EUR",
        emailVerified: true,
        accessToken: "token",
        refreshToken: "refresh",
        expiresAt: Date.now() + 3600_000
      })
    );

    renderApp("/app/events");

    expect(await screen.findByRole("heading", { name: "Your events" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Create event" })).toBeInTheDocument();
  });
});
