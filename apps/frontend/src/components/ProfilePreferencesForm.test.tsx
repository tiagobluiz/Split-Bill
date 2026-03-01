import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ThemeProvider } from "@mui/material";
import { vi, describe, expect, it, beforeEach } from "vitest";
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

  it("submits selected currency using generated client service", async () => {
    render(
      <ThemeProvider theme={appTheme}>
        <ProfilePreferencesForm />
      </ThemeProvider>
    );

    fireEvent.mouseDown(screen.getByLabelText("Preferred currency"));
    fireEvent.click(screen.getByRole("option", { name: "USD" }));
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(() => {
      expect(updatePreferencesMock).toHaveBeenCalledWith({
        preferredCurrency: "USD"
      });
    });
  });
});
