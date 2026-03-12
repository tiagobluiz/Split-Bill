import { CssBaseline, ThemeProvider } from "@mui/material";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";
import { STORAGE_KEY } from "./domain/splitter";
import { appTheme } from "./theme";

const { exportSettlementPdfMock, importReceiptMock } = vi.hoisted(() => ({
  exportSettlementPdfMock: vi.fn(),
  importReceiptMock: vi.fn()
}));

const clipboardWriteTextMock = vi.fn();
const windowOpenMock = vi.fn();

vi.mock("./pdf/exportSettlementPdf", () => ({
  exportSettlementPdf: exportSettlementPdfMock
}));

vi.mock("./receipt-import/importReceipt", () => ({
  importReceipt: importReceiptMock
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
    importReceiptMock.mockReset();
    clipboardWriteTextMock.mockReset();
    clipboardWriteTextMock.mockResolvedValue(undefined);
    windowOpenMock.mockReset();
    Object.defineProperty(window.navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: clipboardWriteTextMock
      }
    });
    Object.defineProperty(window, "open", {
      configurable: true,
      value: windowOpenMock
    });
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

  it(
    "removes a trailing empty item on enter and advances to the split grid",
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
    await user.keyboard("{Enter}");

    expect(screen.getAllByLabelText("Item name")).toHaveLength(2);

    await user.click(screen.getAllByLabelText("Item name")[1] as HTMLElement);
    await user.keyboard("{Enter}");

    expect(getStepButton("Go to step 3: Consumption grid", false)).toHaveAttribute("aria-current", "step");
    expect(screen.getAllByText(/2\.50/).length).toBeGreaterThan(0);
    },
    15000
  );

  it("allows direct step navigation only within the unlocked range", async () => {
    const user = userEvent.setup();
    renderApp();

    await user.click(screen.getByRole("button", { name: "Start splitting" }));
    const step2Button = getStepButton("Go to step 2: Items & prices", false);
    await user.click(step2Button);
    expect(screen.getByLabelText("Add participant")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Go to step 2: Items & prices" })).not.toHaveAttribute(
      "aria-current",
      "step"
    );

    await addParticipant(user, "Ana");
    await addParticipant(user, "Bruno");

    const disabledStep3 = getStepButton("Go to step 3: Consumption grid", true);
    await user.click(disabledStep3);
    expect(screen.getByLabelText("Add participant")).toBeInTheDocument();
    expect(disabledStep3).toHaveAttribute("aria-disabled", "true");

    await user.click(getStepButton("Go to step 2: Items & prices", false));
    expect(await screen.findAllByRole("button", { name: "Add item" })).not.toHaveLength(0);
    expect(getStepButton("Go to step 2: Items & prices", false)).toHaveAttribute("aria-current", "step");
    await user.click(getStepButton("Go to step 4: Results", true));
    expect(getStepButton("Go to step 2: Items & prices", false)).toHaveAttribute("aria-current", "step");

    await user.click(getAddItemButton());
    await user.type(screen.getByLabelText("Item name"), "Milk");
    await user.type(screen.getByLabelText("Price"), "5.00");

    await user.click(getStepButton("Go to step 1: People & payer", false));
    expect(getStepButton("Go to step 1: People & payer", false)).toHaveAttribute("aria-current", "step");

    await user.click(getStepButton("Go to step 4: Results", false));
    expect(screen.getByRole("button", { name: "Go to step 4: Results" })).toHaveAttribute("aria-current", "step");
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

  it(
    "shows export pdf in results and exposes a loading state while exporting",
    async () => {
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
    },
    15000
  );

  it("imports a receipt in step 2 and appends editable items", async () => {
    importReceiptMock.mockResolvedValueOnce({
      source: "image",
      fileName: "receipt.png",
      rawText: "Apples 2.49\nBread 1.20",
      items: [
        { name: "Apples", price: "2.49" },
        { name: "Bread", price: "1.20" }
      ],
      warnings: [{ code: "ignored-summary-lines", message: "Ignored 1 total or payment lines." }]
    });

    const user = userEvent.setup();
    renderApp();

    await user.click(screen.getByRole("button", { name: "Start splitting" }));
    await addParticipant(user, "Ana");
    await addParticipant(user, "Bruno");
    await user.click(getContinueButton());
    await user.click(getAddItemButton());
    await user.type(screen.getByLabelText("Item name"), "Milk");
    await user.type(screen.getByLabelText("Price"), "5.00");

    const file = new File(["mock"], "receipt.png", { type: "image/png" });
    await user.upload(screen.getByLabelText("Import receipt file"), file);
    await user.click(screen.getByRole("button", { name: "Apply import" }));

    expect(importReceiptMock).toHaveBeenCalledTimes(1);
    expect(await screen.findByText(/Imported 2 items from receipt\.png/)).toBeInTheDocument();
    expect(screen.getByDisplayValue("Milk")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Apples")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Bread")).toBeInTheDocument();
    expect(screen.getByText("Ignored 1 total or payment lines.")).toBeInTheDocument();
  });

  it("opens provider handoff, launches the selected provider, and moves into paste mode", async () => {
    const user = userEvent.setup();
    renderApp();

    await user.click(screen.getByRole("button", { name: "Start splitting" }));
    await addParticipant(user, "Ana");
    await addParticipant(user, "Bruno");
    await user.click(getContinueButton());

    await user.click(screen.getByRole("button", { name: "Ask AI" }));
    expect(screen.getByDisplayValue(/Read the uploaded grocery receipt/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "ChatGPT" }));

    expect(windowOpenMock).toHaveBeenCalledWith("https://chatgpt.com/", "_blank", "noopener,noreferrer");
    expect(screen.queryByRole("button", { name: "Copy prompt" })).not.toBeInTheDocument();
    expect(screen.getByLabelText("Pasted items")).toBeInTheDocument();
  });

  it("opens the paste dialog after manually copying the ai prompt", async () => {
    const user = userEvent.setup();
    renderApp();

    await user.click(screen.getByRole("button", { name: "Start splitting" }));
    await addParticipant(user, "Ana");
    await addParticipant(user, "Bruno");
    await user.click(getContinueButton());

    await user.click(screen.getByRole("button", { name: "Ask AI" }));
    expect(screen.getByText("Expected answer format")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Copy prompt" })).toBeInTheDocument();
    expect(screen.getByDisplayValue(/Read the uploaded grocery receipt/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Copy prompt" }));

    expect(screen.queryByRole("button", { name: "Copy prompt" })).not.toBeInTheDocument();
    expect(screen.getByLabelText("Pasted items")).toBeInTheDocument();
  });

  it("does not open the paste dialog when the ai handoff dialog is closed normally", async () => {
    const user = userEvent.setup();
    renderApp();

    await user.click(screen.getByRole("button", { name: "Start splitting" }));
    await addParticipant(user, "Ana");
    await addParticipant(user, "Bruno");
    await user.click(getContinueButton());

    await user.click(screen.getByRole("button", { name: "Ask AI" }));
    await user.click(screen.getByRole("button", { name: "Close" }));

    await waitFor(() => {
      expect(screen.queryByRole("button", { name: "Copy prompt" })).not.toBeInTheDocument();
      expect(screen.queryByLabelText("Pasted items")).not.toBeInTheDocument();
    });
  });

  it("clears the pasted input with the reset action", async () => {
    const user = userEvent.setup();
    renderApp();

    await user.click(screen.getByRole("button", { name: "Start splitting" }));
    await addParticipant(user, "Ana");
    await addParticipant(user, "Bruno");
    await user.click(getContinueButton());

    await user.click(screen.getByRole("button", { name: "Paste list" }));
    const pastedItemsInput = screen.getByLabelText("Pasted items");
    await user.type(pastedItemsInput, "Bananas - 2.49");

    expect(screen.getByRole("button", { name: "Reset" })).toBeEnabled();
    await user.click(screen.getByRole("button", { name: "Reset" }));

    expect(screen.getByLabelText("Pasted items")).toHaveValue("");
    expect(screen.getByRole("button", { name: "Reset" })).toBeDisabled();
  });

  it(
    "parses pasted items and can replace the existing item list",
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

    await user.click(screen.getByRole("button", { name: "Paste list" }));
    await user.type(screen.getByLabelText("Pasted items"), "Bananas - 2.49{enter}Bread,1.20");
    expect(screen.getByText(/Parsed 2 items and ignored 0 lines/)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Import pasted list" }));
    await user.click(screen.getByRole("radio", { name: "Replace current items" }));
    await user.click(screen.getByRole("button", { name: "Apply import" }));

    expect(screen.queryByDisplayValue("Milk")).not.toBeInTheDocument();
    expect(screen.getByDisplayValue("Bananas")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Bread")).toBeInTheDocument();
    expect(await screen.findByText(/Imported 2 items from pasted list/)).toBeInTheDocument();
    },
    15000
  );

  it(
    "resets all step 2 items at once",
    async () => {
      const user = userEvent.setup();
      renderApp();

      await user.click(screen.getByRole("button", { name: "Start splitting" }));
      await addParticipant(user, "Ana");
      await addParticipant(user, "Bruno");
      await user.click(getContinueButton());

      await user.click(getAddItemButton());
      await user.type(screen.getAllByLabelText("Item name")[0] as HTMLElement, "Milk");
      await user.type(screen.getAllByLabelText("Price")[0] as HTMLElement, "5.00");
      await user.click(getAddItemButton());
      await user.type(screen.getAllByLabelText("Item name")[1] as HTMLElement, "Bread");
      await user.type(screen.getAllByLabelText("Price")[1] as HTMLElement, "2.00");

      await user.click(screen.getByRole("button", { name: "Reset items" }));

      expect(screen.queryByDisplayValue("Milk")).not.toBeInTheDocument();
      expect(screen.queryByDisplayValue("Bread")).not.toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Add item" })).toBeInTheDocument();
    },
    15000
  );
});
