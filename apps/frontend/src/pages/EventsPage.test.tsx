import { ThemeProvider } from "@mui/material";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { EventsPage } from "./EventsPage";
import { appTheme } from "../theme";

function renderPage() {
  render(
    <ThemeProvider theme={appTheme}>
      <EventsPage />
    </ThemeProvider>
  );
}

describe("EventsPage", () => {
  afterEach(() => {
    cleanup();
  });

  it("creates an event with participants and selects it", async () => {
    renderPage();

    fireEvent.change(screen.getByLabelText("Event name"), { target: { value: "Road Trip 2026" } });
    fireEvent.change(screen.getByLabelText("Add person"), { target: { value: "Diego" } });
    fireEvent.click(screen.getByRole("button", { name: "Add person" }));
    fireEvent.click(screen.getByRole("button", { name: "Create event" }));

    expect(await screen.findByText('Event "Road Trip 2026" created.')).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Selected" })).toBeInTheDocument();
  });

  it("shows validation when required values are missing", async () => {
    renderPage();

    fireEvent.click(screen.getByRole("button", { name: "Create event" }));

    expect(await screen.findByText("Event name is required")).toBeInTheDocument();
  });

  it("prevents duplicate participants in draft list", async () => {
    renderPage();

    fireEvent.change(screen.getByLabelText("Add person"), { target: { value: "Ana" } });
    fireEvent.click(screen.getByRole("button", { name: "Add person" }));
    fireEvent.change(screen.getByLabelText("Add person"), { target: { value: "ana" } });
    fireEvent.click(screen.getByRole("button", { name: "Add person" }));

    expect(await screen.findByText("This person is already added")).toBeInTheDocument();
  });

  it("adds and removes custom categories for selected event", async () => {
    renderPage();

    fireEvent.change(screen.getByLabelText("Add category"), { target: { value: "Snacks" } });
    fireEvent.click(screen.getByRole("button", { name: "Add category" }));

    expect(await screen.findByText("Snacks")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Remove category Snacks" }));
    expect(screen.queryByText("Snacks")).not.toBeInTheDocument();
  });
});
