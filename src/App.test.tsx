import { CssBaseline, ThemeProvider } from "@mui/material";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import App from "./App";
import { STORAGE_KEY } from "./domain/splitter";
import { appTheme } from "./theme";

function renderApp() {
  return render(
    <ThemeProvider theme={appTheme}>
      <CssBaseline />
      <App />
    </ThemeProvider>
  );
}

async function addParticipant(user: ReturnType<typeof userEvent.setup>, name: string) {
  await user.clear(screen.getByLabelText("Add participant"));
  await user.type(screen.getByLabelText("Add participant"), name);
  await user.click(screen.getByRole("button", { name: "Add" }));
}

describe("App", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it(
    "walks through the core flow and shows the final settlement",
    async () => {
      const user = userEvent.setup();
      renderApp();

      await user.clear(screen.getByLabelText("Currency"));
      await user.type(screen.getByLabelText("Currency"), "EUR");

    await addParticipant(user, "Ana");
    await addParticipant(user, "Bruno");

    await user.click(screen.getByRole("button", { name: "Continue" }));
    await user.click(screen.getByRole("button", { name: "Add item" }));

    await user.type(screen.getByLabelText("Item name"), "Milk");
    await user.type(screen.getByLabelText("Price"), "5.00");

    await user.click(screen.getByRole("button", { name: "Continue" }));
    await user.click(screen.getAllByRole("button", { name: "Included" })[0]);
    await user.click(screen.getByRole("button", { name: "Continue" }));

      expect(screen.getByText("Bruno pays Ana €5.00")).toBeInTheDocument();
      expect(screen.getByText("Gets reimbursed")).toBeInTheDocument();
    },
    15000
  );

  it("offers to restore a saved draft", async () => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        step: 1,
        values: {
          currency: "EUR",
          payerParticipantId: "ana",
          participants: [
            { id: "ana", name: "Ana" },
            { id: "bruno", name: "Bruno" }
          ],
          items: []
        }
      })
    );

    const user = userEvent.setup();
    renderApp();

    expect(screen.getByText("Restore your last split?")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Restore draft" }));

    expect(await screen.findByRole("button", { name: "Add item" })).toBeInTheDocument();
    expect(await screen.findByText("Ana paid the receipt.")).toBeInTheDocument();
  });
});
