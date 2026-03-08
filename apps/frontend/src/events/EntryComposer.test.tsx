import { ThemeProvider } from "@mui/material";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { EntryComposer } from "./EntryComposer";
import { appTheme } from "../theme";

const people = [
  { id: "p1", displayName: "Ana", linkedAccountId: null },
  { id: "p2", displayName: "Bruno", linkedAccountId: null },
  { id: "p3", displayName: "Carla", linkedAccountId: null },
  { id: "p4", displayName: "Diego", linkedAccountId: null }
];

function renderComposer(onSubmit = vi.fn().mockResolvedValue(undefined)) {
  render(
    <ThemeProvider theme={appTheme}>
      <EntryComposer
        eventCurrency="EUR"
        people={people}
        categories={["Food", "Transport"]}
        onCancel={vi.fn()}
        onSubmit={onSubmit}
      />
    </ThemeProvider>
  );

  return { onSubmit };
}

describe("EntryComposer", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("submits an even split entry payload", async () => {
    const { onSubmit } = renderComposer();

    fireEvent.change(screen.getByLabelText("Entry name"), { target: { value: "Restaurant lunch" } });
    fireEvent.change(screen.getByLabelText("Amount"), { target: { value: "100" } });
    fireEvent.change(screen.getByLabelText("Date"), { target: { value: "2026-03-07T12:30" } });
    fireEvent.click(screen.getByRole("button", { name: "Add entry" }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledTimes(1);
    });

    const payload = onSubmit.mock.calls[0][0] as {
      name: string;
      amount: string;
      participants: Array<{ personId: string; splitMode: string }>;
      occurredAtUtc: string;
    };

    expect(payload.name).toBe("Restaurant lunch");
    expect(payload.amount).toBe("100.0000");
    expect(payload.participants).toEqual([
      { personId: "p1", splitMode: "EVEN" },
      { personId: "p2", splitMode: "EVEN" },
      { personId: "p3", splitMode: "EVEN" },
      { personId: "p4", splitMode: "EVEN" }
    ]);
    expect(payload.occurredAtUtc).toContain("2026-03-07T");
  });

  it("blocks percent mode submission when total is not 100", async () => {
    const { onSubmit } = renderComposer();

    fireEvent.change(screen.getByLabelText("Entry name"), { target: { value: "Dinner" } });
    fireEvent.change(screen.getByLabelText("Amount"), { target: { value: "90" } });
    fireEvent.click(screen.getByRole("button", { name: "Percent" }));
    fireEvent.change(screen.getByLabelText("Ana share"), { target: { value: "80" } });
    fireEvent.change(screen.getByLabelText("Bruno share"), { target: { value: "30" } });
    fireEvent.click(screen.getByRole("button", { name: "Add entry" }));

    expect(await screen.findByText("Percent total must equal 100")).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("rebalances untouched percent shares while preserving manually edited ones", async () => {
    renderComposer();

    fireEvent.change(screen.getByLabelText("Amount"), { target: { value: "90" } });
    fireEvent.click(screen.getByRole("button", { name: "Percent" }));

    expect(screen.getByLabelText("Ana share")).toHaveValue("25");
    expect(screen.getByLabelText("Bruno share")).toHaveValue("25");
    expect(screen.getByLabelText("Carla share")).toHaveValue("25");
    expect(screen.getByLabelText("Diego share")).toHaveValue("25");
    expect(screen.getByLabelText("Ana resolved amount")).toHaveValue("€22.50");

    fireEvent.change(screen.getByLabelText("Ana share"), { target: { value: "50" } });

    expect(screen.getByLabelText("Ana share")).toHaveValue("50");
    expect(screen.getByLabelText("Bruno share")).toHaveValue("16.67");
    expect(screen.getByLabelText("Carla share")).toHaveValue("16.67");
    expect(screen.getByLabelText("Diego share")).toHaveValue("16.66");
    expect(screen.getByLabelText("Ana resolved amount")).toHaveValue("€45.00");
    expect(screen.getByLabelText("Bruno resolved amount")).toHaveValue("€15.00");

    fireEvent.change(screen.getByLabelText("Bruno share"), { target: { value: "20" } });

    expect(screen.getByLabelText("Ana share")).toHaveValue("50");
    expect(screen.getByLabelText("Bruno share")).toHaveValue("20");
    expect(screen.getByLabelText("Carla share")).toHaveValue("15");
    expect(screen.getByLabelText("Diego share")).toHaveValue("15");
    expect(screen.getByLabelText("Carla resolved amount")).toHaveValue("€13.50");
    expect(screen.getByLabelText("Diego resolved amount")).toHaveValue("€13.50");
  });
});
