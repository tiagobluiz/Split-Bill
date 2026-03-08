import { ThemeProvider } from "@mui/material";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { RegisterPage } from "./RegisterPage";
import { appTheme } from "../theme";

const authRegisterPostMock = vi.fn();

vi.mock("../api/contractsClient", () => ({
  authApi: {
    authRegisterPost: (payload: unknown) => authRegisterPostMock(payload)
  }
}));

function renderPage() {
  return render(
    <ThemeProvider theme={appTheme}>
      <MemoryRouter initialEntries={["/register"]}>
        <Routes>
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/sign-in" element={<div>Sign in page</div>} />
        </Routes>
      </MemoryRouter>
    </ThemeProvider>
  );
}

describe("RegisterPage", () => {
  beforeEach(() => {
    authRegisterPostMock.mockResolvedValue({});
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("submits account creation to the backend and redirects to sign in", async () => {
    renderPage();

    fireEvent.change(screen.getByLabelText("Full name"), { target: { value: "Tiago" } });
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "tiagobluiz@gmail.com" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "12345678" } });
    fireEvent.change(screen.getByLabelText("Confirm password"), { target: { value: "12345678" } });
    fireEvent.click(screen.getByRole("button", { name: "Create account" }));

    await waitFor(() => {
      expect(authRegisterPostMock).toHaveBeenCalledWith({
        registerRequest: {
          name: "Tiago",
          email: "tiagobluiz@gmail.com",
          password: "12345678"
        }
      });
    });

    expect(await screen.findByText("Sign in page")).toBeInTheDocument();
  });
});
