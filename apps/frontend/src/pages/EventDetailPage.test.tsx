import { ThemeProvider } from "@mui/material";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { appTheme } from "../theme";
import { EventDetailPage } from "./EventDetailPage";

const fetchEventDetailsMock = vi.fn();
const fetchEventBalancesMock = vi.fn();
const updateEventSettingsMock = vi.fn();

vi.mock("../auth/AuthContext", () => ({
  useAuth: () => ({
    session: {
      accountId: "acc-1"
    }
  })
}));

vi.mock("../events/eventsService", () => ({
  fetchEventDetails: (eventId: string) => fetchEventDetailsMock(eventId),
  fetchEventBalances: (...args: unknown[]) => fetchEventBalancesMock(...args),
  addEventPerson: vi.fn(),
  createEntry: vi.fn(),
  updateEventSettings: (...args: unknown[]) => updateEventSettingsMock(...args),
  apiErrorMessage: async (error: unknown, fallback: string) =>
    error instanceof Error ? error.message : fallback
}));

const baseEvent = {
  event: {
    id: "evt-1",
    name: "Road Trip",
    currency: "EUR",
    timezone: "Europe/Paris",
    settlementAlgorithm: "min-transfer" as const
  },
  people: [
    { id: "p1", displayName: "Ana", linkedAccountId: "acc-1" },
    { id: "p2", displayName: "Diego", linkedAccountId: null }
  ],
  entries: []
};

function renderPage() {
  render(
    <ThemeProvider theme={appTheme}>
      <MemoryRouter initialEntries={["/app/events/evt-1"]}>
        <Routes>
          <Route path="/app/events/:eventId" element={<EventDetailPage />} />
        </Routes>
      </MemoryRouter>
    </ThemeProvider>
  );
}

describe("EventDetailPage", () => {
  beforeEach(() => {
    fetchEventDetailsMock.mockResolvedValue(baseEvent);
    fetchEventBalancesMock.mockResolvedValue({
      eventId: "evt-1",
      currency: "EUR",
      algorithm: "min-transfer",
      balances: [
        {
          personId: "p1",
          netAmount: "22.50",
          owes: [],
          owedBy: [{ counterpartyPersonId: "p2", amount: "22.50", currency: "EUR" }]
        },
        {
          personId: "p2",
          netAmount: "-22.50",
          owes: [{ counterpartyPersonId: "p1", amount: "22.50", currency: "EUR" }],
          owedBy: []
        }
      ]
    });
    updateEventSettingsMock.mockResolvedValue(undefined);
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("shows entries, balances, and settings tabs", async () => {
    renderPage();

    expect(await screen.findByRole("tab", { name: "Entries" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Balances" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Settings" })).toBeInTheDocument();
    expect(screen.getByText("No entries yet for this event.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add entry" })).toBeInTheDocument();
  });

  it("renders balances using the selected algorithm", async () => {
    renderPage();
    fireEvent.click(await screen.findByRole("tab", { name: "Balances" }));

    expect(await screen.findByText("Who sends to whom")).toBeInTheDocument();
    expect(fetchEventBalancesMock).toHaveBeenCalledWith("evt-1", "min-transfer");
    expect(screen.getByText("Diego pays Ana")).toBeInTheDocument();
    expect(within(screen.getByText("Diego pays Ana").closest("div") as HTMLElement).getByText("€22.50")).toBeInTheDocument();
    expect(screen.getAllByText("You'll get back").length).toBeGreaterThan(0);
  });

  it("allows category editing from settings tab", async () => {
    renderPage();
    fireEvent.click(await screen.findByRole("tab", { name: "Settings" }));

    fireEvent.change(await screen.findByLabelText("Add category"), { target: { value: "Activities" } });
    fireEvent.click(screen.getByRole("button", { name: "Add category" }));
    expect(screen.getByText("Activities")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Remove category Food" }));
    expect(screen.queryByText("Food")).not.toBeInTheDocument();
  });
});
