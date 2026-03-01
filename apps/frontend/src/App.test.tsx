import { ThemeProvider } from "@mui/material";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { MemoryRouter } from "react-router-dom";
import App from "./App";
import { AuthProvider } from "./auth/AuthContext";
import { appTheme } from "./theme";

const SESSION_STORAGE_KEY = "splitbill.session.v1";

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
  });

  afterEach(() => {
    cleanup();
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
      JSON.stringify({ email: "member@splitbill.test", displayName: "member" })
    );

    renderApp("/sign-in");

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Your events" })).toBeInTheDocument();
    });
  });
});
