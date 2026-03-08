import { ThemeProvider } from "@mui/material";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { DashboardPage } from "./DashboardPage";
import { appTheme } from "../theme";

const createEventMock = vi.fn();
const fetchEventsMock = vi.fn();

vi.mock("../events/eventsService", () => ({
  fetchEvents: () => fetchEventsMock(),
  createEvent: (payload: unknown) => createEventMock(payload),
  apiErrorMessage: async (error: unknown, fallback: string) =>
    error instanceof Error ? error.message : fallback
}));

function renderPage() {
  render(
    <ThemeProvider theme={appTheme}>
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>
    </ThemeProvider>
  );
}

describe("DashboardPage", () => {
  beforeEach(() => {
    fetchEventsMock.mockResolvedValue([]);
    createEventMock.mockResolvedValue({
      id: "evt-1",
      name: "Summer Trip 2026",
      currency: "EUR",
      timezone: "Europe/Paris",
      settlementAlgorithm: "min-transfer"
    });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("opens create-event modal from dashboard action", async () => {
    renderPage();

    fireEvent.click(screen.getByRole("button", { name: "Create event" }));
    expect(await screen.findByRole("heading", { name: "Create event" })).toBeInTheDocument();
  });

  it("creates an event from modal and renders it on dashboard", async () => {
    renderPage();

    fireEvent.click(screen.getByRole("button", { name: "Create event" }));
    const dialog = await screen.findByRole("dialog");
    fireEvent.change(within(dialog).getByLabelText("Event name"), { target: { value: "Summer Trip 2026" } });
    fireEvent.change(within(dialog).getByLabelText("Add person"), { target: { value: "Ana" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Add person" }));
    fireEvent.click(within(dialog).getByRole("button", { name: "Create event" }));

    expect(await screen.findByText("Summer Trip 2026")).toBeInTheDocument();
    expect(createEventMock).toHaveBeenCalledTimes(1);
  });

  it("shows validation summary on invalid submit", async () => {
    renderPage();

    fireEvent.click(screen.getByRole("button", { name: "Create event" }));
    const dialog = await screen.findByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Create event" }));

    expect(await screen.findByText("We could not save this yet. Review the highlighted fields.")).toBeInTheDocument();
    expect(screen.getByText("Event name is required")).toBeInTheDocument();
  });

  it("shows algorithm help affordances for both options", async () => {
    renderPage();

    fireEvent.click(screen.getByRole("button", { name: "Create event" }));

    expect(await screen.findByRole("button", { name: "Min transfer description" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Pairwise description" })).toBeInTheDocument();
  });
});
