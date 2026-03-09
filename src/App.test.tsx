import { CssBaseline, ThemeProvider } from "@mui/material";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";
import { STORAGE_KEY } from "./domain/splitter";
import { appTheme } from "./theme";

const { exportSettlementPdfMock } = vi.hoisted(() => ({
  exportSettlementPdfMock: vi.fn()
}));

vi.mock("./pdf/exportSettlementPdf", () => ({
  exportSettlementPdf: exportSettlementPdfMock
}));

function renderApp() {
  return render(
    <ThemeProvider theme={appTheme}>
      <CssBaseline />
      <App />
    </ThemeProvider>
  );
}

function getContinueButton() {
  return screen.getAllByRole("button", { name: "Continue" }).at(-1) as HTMLButtonElement;
}

function getAddItemButton() {
  return screen.getAllByRole("button", { name: "Add item" }).at(-1) as HTMLButtonElement;
}

function getStepButton(name: string, disabled: boolean) {
  return screen
    .getAllByRole("button", { name })
    .find((element) => element.getAttribute("aria-disabled") === String(disabled)) as HTMLDivElement;
}

async function addParticipant(user: ReturnType<typeof userEvent.setup>, name: string) {
  await user.clear(screen.getByLabelText("Add participant"));
  await user.type(screen.getByLabelText("Add participant"), name);
  await user.click(screen.getByRole("button", { name: "Add" }));
}

describe("App", () => {
  beforeEach(() => {
    window.localStorage.clear();
    exportSettlementPdfMock.mockReset();
  });

  afterEach(() => {
    cleanup();
  });

  it(
    "walks through the core flow and shows the final settlement",
    async () => {
      const user = userEvent.setup();
      renderApp();

      await user.click(screen.getByRole("button", { name: "Start splitting" }));
      await addParticipant(user, "Ana");
      await addParticipant(user, "Bruno");

      await user.click(getContinueButton());
      await user.click(getAddItemButton());

      await user.type(screen.getByLabelText("Item name"), "Milk");
      await user.type(screen.getByLabelText("Price"), "5.00");

      await user.click(getContinueButton());

      expect(screen.getAllByText(/2\.50/).length).toBeGreaterThan(0);

      await user.click(getContinueButton());

      expect(screen.getByText("Final balances")).toBeInTheDocument();
      expect(screen.getByText("Bruno")).toBeInTheDocument();
      expect(screen.getAllByText(/5\.00/).length).toBeGreaterThan(0);
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
    expect(screen.queryByText("Ana paid the receipt.")).not.toBeInTheDocument();
  });

  it(
    "removes participants and items cleanly",
    async () => {
      const user = userEvent.setup();
      renderApp();

      await user.click(screen.getByRole("button", { name: "Start splitting" }));
      await addParticipant(user, "Ana");
      await addParticipant(user, "Bruno");
      await user.click(screen.getByRole("button", { name: "Remove Bruno" }));

      expect(screen.queryByDisplayValue("Bruno")).not.toBeInTheDocument();

      await addParticipant(user, "Bruno");
      await user.click(getContinueButton());
      await user.click(getAddItemButton());
      await user.type(screen.getByLabelText("Item name"), "Milk");
      await user.type(screen.getByLabelText("Price"), "5.00");
      await user.click(screen.getByRole("button", { name: "Delete Milk" }));

      expect(screen.queryByDisplayValue("Milk")).not.toBeInTheDocument();
    },
    15000
  );

  it("removes a trailing empty item on enter and advances to the split grid", async () => {
    const user = userEvent.setup();
    renderApp();

    await user.click(screen.getByRole("button", { name: "Start splitting" }));
    await addParticipant(user, "Ana");
    await addParticipant(user, "Bruno");
    await user.click(getContinueButton());
    await user.click(getAddItemButton());

    await user.type(screen.getByLabelText("Item name"), "Milk");
    await user.type(screen.getByLabelText("Price"), "5.00");
    await user.keyboard("{Enter}");

    expect(screen.getAllByLabelText("Item name")).toHaveLength(2);

    await user.click(screen.getAllByLabelText("Item name")[1] as HTMLElement);
    await user.keyboard("{Enter}");

    expect(getStepButton("Go to step 3: Consumption grid", false)).toHaveAttribute("aria-current", "step");
    expect(screen.getAllByText(/2\.50/).length).toBeGreaterThan(0);
  });

  it("allows direct step navigation only within the unlocked range", async () => {
    const user = userEvent.setup();
    renderApp();

    await user.click(screen.getByRole("button", { name: "Start splitting" }));
    const disabledStep3 = getStepButton("Go to step 3: Consumption grid", true);
    await user.click(disabledStep3);
    expect(screen.getByLabelText("Add participant")).toBeInTheDocument();
    expect(disabledStep3).toHaveAttribute("aria-disabled", "true");

    await user.click(getStepButton("Go to step 2: Consumption", false));
    expect(await screen.findAllByRole("button", { name: "Add item" })).not.toHaveLength(0);
    expect(getStepButton("Go to step 2: Consumption", false)).toHaveAttribute("aria-current", "step");

    await user.click(getStepButton("Go to step 1: People & payer", false));
    expect(getStepButton("Go to step 1: People & payer", false)).toHaveAttribute("aria-current", "step");

    await user.click(getStepButton("Go to step 4: Results", false));
    expect(getStepButton("Go to step 4: Results", false)).toHaveAttribute("aria-current", "step");
  });

  it("opens on the landing hero and only shows the splitter after start", async () => {
    const user = userEvent.setup();
    renderApp();

    expect(screen.getByText("Split grocery bills without the spreadsheet drama.")).toBeInTheDocument();
    expect(screen.queryByLabelText("Add participant")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Start splitting" }));

    expect(screen.getByLabelText("Add participant")).toBeInTheDocument();
    expect(screen.queryByText("Quick flow")).not.toBeInTheDocument();
  });

  it("shows export pdf in results and exposes a loading state while exporting", async () => {
    let resolveExport = () => {};
    exportSettlementPdfMock.mockReturnValueOnce(
      new Promise<void>((resolve) => {
        resolveExport = resolve;
      })
    );

    const user = userEvent.setup();
    renderApp();

    await user.click(screen.getByRole("button", { name: "Start splitting" }));
    await addParticipant(user, "Ana");
    await addParticipant(user, "Bruno");
    await user.click(getContinueButton());
    await user.click(getAddItemButton());
    await user.type(screen.getByLabelText("Item name"), "Milk");
    await user.type(screen.getByLabelText("Price"), "5.00");
    await user.click(getContinueButton());
    await user.click(getContinueButton());

    const exportButton = screen.getByRole("button", { name: "Export PDF" });
    await user.click(exportButton);

    expect(exportSettlementPdfMock).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: "Exporting PDF..." })).toBeDisabled();

    resolveExport();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Export PDF" })).toBeEnabled();
    });
    expect(await screen.findByText("PDF exported.")).toBeInTheDocument();
  });
});
