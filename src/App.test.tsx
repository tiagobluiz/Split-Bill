import { CssBaseline, ThemeProvider } from "@mui/material";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
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

function isVisible(element: Element | null): element is HTMLElement {
  if (!(element instanceof HTMLElement)) {
    return false;
  }

  const styles = window.getComputedStyle(element);
  return styles.display !== "none" && styles.visibility !== "hidden";
}

function getContinueButton() {
  return screen.getAllByRole("button", { name: "Continue" }).find(isVisible) as HTMLButtonElement;
}

function getFieldInputsByHighestIndex(label: string) {
  const inputs = screen
    .getAllByLabelText(label)
    .filter((element): element is HTMLInputElement => element instanceof HTMLInputElement);

  const highestIndex = inputs.reduce((currentMax, input) => {
    const nextIndex = Number(input.name.match(/items\.(\d+)\./)?.[1] ?? -1);
    return Math.max(currentMax, nextIndex);
  }, -1);

  return inputs
    .filter((input) => Number(input.name.match(/items\.(\d+)\./)?.[1] ?? -1) === highestIndex)
    .sort((left, right) => {
    const leftIndex = Number(left.name.match(/items\.(\d+)\./)?.[1] ?? -1);
    const rightIndex = Number(right.name.match(/items\.(\d+)\./)?.[1] ?? -1);
      return rightIndex - leftIndex;
    });
}

function getDraftItemNameInput() {
  return getFieldInputsByHighestIndex("Item name").at(-1) as HTMLInputElement;
}

function getStepButton(name: string, disabled: boolean) {
  return screen
    .getAllByRole("button", { name })
    .find((element) => {
      if (!isVisible(element)) {
        return false;
      }

      const isDisabled = element.getAttribute("aria-disabled") === "true" || (element as HTMLButtonElement).disabled;
      return isDisabled === disabled;
    }) as HTMLButtonElement;
}

function getImportOption(name: RegExp) {
  return screen.getAllByRole("button", { name }).find(isVisible) as HTMLButtonElement;
}

async function addParticipant(user: ReturnType<typeof userEvent.setup>, name: string) {
  const participantInput = screen.getByPlaceholderText("Participant name");
  await user.clear(participantInput);
  await user.type(participantInput, name);
  await user.click(screen.getByRole("button", { name: "Add person" }));
}

async function addItemLine(user: ReturnType<typeof userEvent.setup>, name: string, price: string) {
  const nameInputs = getFieldInputsByHighestIndex("Item name");
  const priceInputs = getFieldInputsByHighestIndex("Price");

  for (const input of nameInputs) {
    fireEvent.change(input, { target: { value: name } });
  }

  for (const input of priceInputs) {
    fireEvent.change(input, { target: { value: price } });
  }

  await user.click(priceInputs.at(-1) as HTMLInputElement);
  await user.keyboard("{Enter}");
}

async function removeTrailingDraftItem(user: ReturnType<typeof userEvent.setup>) {
  await waitFor(() => {
    expect(getDraftItemNameInput()).toBeInTheDocument();
  });
  await user.click(getDraftItemNameInput());
  await user.keyboard("{Enter}");
}

function getVisibleInputByValue(value: string) {
  return screen
    .getAllByLabelText("Item name")
    .find(
      (element) =>
        element instanceof HTMLInputElement &&
        element.value === value
    ) as HTMLInputElement;
}

function getVisibleDeleteItemButton() {
  return screen
    .getAllByRole("button", { name: /Delete /i })
    .find(isVisible) as HTMLButtonElement;
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
      await addItemLine(user, "Milk", "5.00");
      await removeTrailingDraftItem(user);
      await waitFor(() => {
        expect(screen.getByRole("button", { name: "Go to step 3: Split" })).toHaveAttribute("aria-current", "step");
      });
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

    expect((await screen.findAllByLabelText("Item name")).find(isVisible)).toBeInTheDocument();
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
      await addItemLine(user, "Milk", "5.00");
      await waitFor(() => {
        expect(getVisibleDeleteItemButton()).toBeDefined();
      });
      await user.click(getVisibleDeleteItemButton());

      expect(screen.queryByDisplayValue("Milk")).not.toBeInTheDocument();
    },
    15000
  );

  it(
    "advances to the split grid when enter is pressed on an empty draft item and step 2 is already valid",
    async () => {
    const user = userEvent.setup();
    renderApp();

    await user.click(screen.getByRole("button", { name: "Start splitting" }));
    await addParticipant(user, "Ana");
    await addParticipant(user, "Bruno");
    await user.click(getContinueButton());
    await addItemLine(user, "Milk", "5.00");
    await removeTrailingDraftItem(user);

    await waitFor(() => {
      expect(getStepButton("Go to step 3: Split", false)).toHaveAttribute(
        "aria-current",
        "step"
      );
    });
    expect(screen.getAllByText(/2\.50/).length).toBeGreaterThan(0);
    },
    15000
  );

  it(
    "allows direct step navigation only within the unlocked range",
    async () => {
      const user = userEvent.setup();
      renderApp();

      await user.click(screen.getByRole("button", { name: "Start splitting" }));
      const step2Button = getStepButton("Go to step 2: Items", false);
      await user.click(step2Button);
      expect(screen.getByPlaceholderText("Participant name")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Go to step 2: Items" })).not.toHaveAttribute(
        "aria-current",
        "step"
      );

      await addParticipant(user, "Ana");
      await addParticipant(user, "Bruno");

      const disabledStep3 = getStepButton("Go to step 3: Split", true);
      expect(screen.getByPlaceholderText("Participant name")).toBeInTheDocument();
      expect(disabledStep3).toBeDisabled();

      await user.click(getStepButton("Go to step 2: Items", false));
      expect(await screen.findAllByLabelText("Item name")).not.toHaveLength(0);
      expect(screen.getByRole("button", { name: "Go to step 2: Items" })).toHaveAttribute("aria-current", "step");
      await user.click(getStepButton("Go to step 4: Balances", true));
      expect(screen.getByRole("button", { name: "Go to step 2: Items" })).toHaveAttribute("aria-current", "step");

      await addItemLine(user, "Milk", "5.00");
      await removeTrailingDraftItem(user);
      await waitFor(() => {
        expect(screen.getByRole("button", { name: "Go to step 4: Balances" })).not.toHaveAttribute(
          "aria-disabled",
          "true"
        );
      });

      await user.click(getStepButton("Go to step 1: Participants", false));
      expect(getStepButton("Go to step 1: Participants", false)).toHaveAttribute("aria-current", "step");

      await user.click(getStepButton("Go to step 4: Balances", false));
      expect(await screen.findByText("Final balances")).toBeInTheDocument();
    },
    15000
  );

  it("opens on the landing hero and only shows the splitter after start", async () => {
    const user = userEvent.setup();
    renderApp();

    expect(screen.getByText("Split grocery bills without the spreadsheet drama.")).toBeInTheDocument();
    expect(screen.queryByPlaceholderText("Participant name")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Start splitting" }));

    expect(screen.getByPlaceholderText("Participant name")).toBeInTheDocument();
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
    await addItemLine(user, "Milk", "5.00");
    await removeTrailingDraftItem(user);
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Go to step 3: Split" })).toHaveAttribute("aria-current", "step");
    });
    await user.click(getContinueButton());

    const exportButton = screen.getByRole("button", { name: "Export to PDF" });
    await user.click(exportButton);

    expect(exportSettlementPdfMock).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: "Exporting PDF..." })).toBeDisabled();

    resolveExport();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Export to PDF" })).toBeEnabled();
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
    await addItemLine(user, "Milk", "5.00");
    await removeTrailingDraftItem(user);
    await user.click(getStepButton("Go to step 2: Items", false));

    const file = new File(["mock"], "receipt.png", { type: "image/png" });
    await user.upload(screen.getByLabelText("Import receipt file"), file);
    await user.click(screen.getByRole("button", { name: "Apply import" }));

      expect(importReceiptMock).toHaveBeenCalledTimes(1);
      expect(await screen.findByText(/Imported 2 items from receipt\.png/)).toBeInTheDocument();
      expect(getVisibleInputByValue("Milk")).toBeInTheDocument();
      expect(getVisibleInputByValue("Apples")).toBeInTheDocument();
      expect(getVisibleInputByValue("Bread")).toBeInTheDocument();
    expect(screen.getByText("Ignored 1 total or payment lines.")).toBeInTheDocument();
  });

  it("opens provider handoff, launches the selected provider, and moves into paste mode", async () => {
    const user = userEvent.setup();
    renderApp();

    await user.click(screen.getByRole("button", { name: "Start splitting" }));
    await addParticipant(user, "Ana");
    await addParticipant(user, "Bruno");
    await user.click(getContinueButton());

    await user.click(screen.getByRole("button", { name: "Import" }));
    await user.click(getImportOption(/^Ask AI/));
    expect(screen.getByDisplayValue(/Read the uploaded grocery receipt/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "ChatGPT" }));

    expect(windowOpenMock).toHaveBeenCalledWith("https://chatgpt.com/", "_blank", "noopener,noreferrer");
    expect(screen.queryByRole("button", { name: "Copy prompt" })).not.toBeInTheDocument();
    expect(screen.getByLabelText("Pasted items")).toBeInTheDocument();
  });

  it("uses a mobile-aware handoff target for provider launch on mobile", async () => {
    const originalUserAgent = navigator.userAgent;
    try {
      Object.defineProperty(window.navigator, "userAgent", {
        configurable: true,
        value: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)"
      });

      const user = userEvent.setup();
      renderApp();

      await user.click(screen.getByRole("button", { name: "Start splitting" }));
      await addParticipant(user, "Ana");
      await addParticipant(user, "Bruno");
      await user.click(getContinueButton());

      await user.click(screen.getByRole("button", { name: "Import" }));
      await user.click(getImportOption(/^Ask AI/));
      await user.click(screen.getByRole("button", { name: "ChatGPT" }));

      expect(windowOpenMock).toHaveBeenCalledWith("https://chatgpt.com/", "_self", "noopener,noreferrer");
    } finally {
      Object.defineProperty(window.navigator, "userAgent", {
        configurable: true,
        value: originalUserAgent
      });
    }
  });

  it("opens the paste dialog after manually copying the ai prompt", async () => {
    const user = userEvent.setup();
    renderApp();

    await user.click(screen.getByRole("button", { name: "Start splitting" }));
    await addParticipant(user, "Ana");
    await addParticipant(user, "Bruno");
    await user.click(getContinueButton());

    await user.click(screen.getByRole("button", { name: "Import" }));
    await user.click(getImportOption(/^Ask AI/));
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

    await user.click(screen.getByRole("button", { name: "Import" }));
    await user.click(getImportOption(/^Ask AI/));
    await user.click(screen.getByRole("button", { name: "Close" }));

    await waitFor(() => {
      expect(screen.queryByRole("button", { name: "Copy prompt" })).not.toBeInTheDocument();
      expect(screen.queryByLabelText("Pasted items")).not.toBeInTheDocument();
    });
  });

  it(
    "clears the pasted input with the reset action",
    async () => {
      const user = userEvent.setup();
      renderApp();

      await user.click(screen.getByRole("button", { name: "Start splitting" }));
      await addParticipant(user, "Ana");
      await addParticipant(user, "Bruno");
      await user.click(getContinueButton());

      await user.click(screen.getByRole("button", { name: "Import" }));
      await user.click(getImportOption(/^Paste list/));
      const pastedItemsInput = screen.getByLabelText("Pasted items");
      await user.type(pastedItemsInput, "Bananas - 2.49");

      expect(screen.getByRole("button", { name: "Reset" })).toBeEnabled();
      await user.click(screen.getByRole("button", { name: "Reset" }));

      expect(screen.getByLabelText("Pasted items")).toHaveValue("");
      expect(screen.getByRole("button", { name: "Reset" })).toBeDisabled();
    },
    15000
  );

  it(
    "parses pasted items and can replace the existing item list",
    async () => {
    const user = userEvent.setup();
    renderApp();

    await user.click(screen.getByRole("button", { name: "Start splitting" }));
    await addParticipant(user, "Ana");
    await addParticipant(user, "Bruno");
    await user.click(getContinueButton());
    await addItemLine(user, "Milk", "5.00");
    await removeTrailingDraftItem(user);
    await user.click(getStepButton("Go to step 2: Items", false));

    await user.click(screen.getByRole("button", { name: "Import" }));
    await user.click(getImportOption(/^Paste list/));
    await user.type(screen.getByLabelText("Pasted items"), "Bananas - 2.49{enter}Bread,1.20");
    expect(screen.getByText(/Parsed 2 items and ignored 0 lines/)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Import pasted list" }));
    await user.click(screen.getByRole("radio", { name: "Replace current items" }));
    await user.click(screen.getByRole("button", { name: "Apply import" }));

    expect(screen.queryByDisplayValue("Milk")).not.toBeInTheDocument();
    expect(getVisibleInputByValue("Bananas")).toBeInTheDocument();
    expect(getVisibleInputByValue("Bread")).toBeInTheDocument();
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

      await addItemLine(user, "Milk", "5.00");
      await addItemLine(user, "Bread", "2.00");

      await user.click(screen.getByRole("button", { name: "Reset items" }));
      await user.click(screen.getAllByRole("button", { name: "Reset items" }).findLast(isVisible) as HTMLButtonElement);

      expect(screen.queryByDisplayValue("Milk")).not.toBeInTheDocument();
      expect(screen.queryByDisplayValue("Bread")).not.toBeInTheDocument();
      expect(screen.getAllByLabelText("Item name").find(isVisible)).toBeInTheDocument();
    },
    15000
  );
});
