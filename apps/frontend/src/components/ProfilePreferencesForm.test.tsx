import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ThemeProvider } from "@mui/material";
import { vi, describe, expect, it, beforeEach, afterEach } from "vitest";
import { ProfilePreferencesForm } from "./ProfilePreferencesForm";
import { appTheme } from "../theme";

const updatePreferencesMock = vi.fn();

vi.mock("../api/profileService", () => ({
  updatePreferences: (input: { preferredCurrency: string }) =>
    updatePreferencesMock(input)
}));

describe("ProfilePreferencesForm", () => {
  beforeEach(() => {
    updatePreferencesMock.mockReset();
    updatePreferencesMock.mockResolvedValue({});
  });
  afterEach(() => {
    cleanup();
  });

  const changeCurrency = (currency: string) => {
    fireEvent.mouseDown(screen.getByLabelText("Preferred currency"));
    fireEvent.click(screen.getByRole("option", { name: currency }));
  };

  it("submits selected currency using generated client service", async () => {
    render(
      <ThemeProvider theme={appTheme}>
        <ProfilePreferencesForm />
      </ThemeProvider>
    );

    changeCurrency("USD");
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(() => {
      expect(updatePreferencesMock).toHaveBeenCalledWith({
        preferredCurrency: "USD"
      });
    });
  });

  it("shows an error alert when preferences update fails", async () => {
    updatePreferencesMock.mockRejectedValueOnce(new Error("Network error"));

    render(
      <ThemeProvider theme={appTheme}>
        <ProfilePreferencesForm />
      </ThemeProvider>
    );

    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

    expect(await screen.findByText("Failed to save preferences. Please try again.")).toBeInTheDocument();
  });

  it("clears success alert when user changes form value after submit", async () => {
    render(
      <ThemeProvider theme={appTheme}>
        <ProfilePreferencesForm />
      </ThemeProvider>
    );

    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
    expect(await screen.findByText("Preferences updated successfully.")).toBeInTheDocument();

    changeCurrency("BRL");

    await waitFor(() => {
      expect(screen.queryByText("Preferences updated successfully.")).not.toBeInTheDocument();
    });
  });
});
