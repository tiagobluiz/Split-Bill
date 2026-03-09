import { describe, expect, it } from "vitest";
import { createEmptyItem, type SplitFormValues } from "../domain/splitter";
import { buildPdfExportData, buildPdfFilename } from "./buildPdfExportData";

function buildValues(values: Partial<SplitFormValues>): SplitFormValues {
  return {
    currency: "EUR",
    participants: [],
    payerParticipantId: "",
    items: [],
    ...values
  };
}

describe("buildPdfExportData", () => {
  it("matches the authoritative final settlement totals", () => {
    const participants = [
      { id: "ana", name: "Ana" },
      { id: "tiago", name: "Tiago" },
      { id: "rodrigo", name: "Rodrigo" }
    ];

    const data = buildPdfExportData(
      buildValues({
        participants,
        payerParticipantId: "ana",
        items: Array.from({ length: 8 }, (_, index) => ({
          ...createEmptyItem(participants),
          id: `item-${index + 1}`,
          name: `Item ${index + 1}`,
          price: "1.00"
        }))
      }),
      new Date("2026-03-09T12:00:00Z")
    );

    expect(data.totalCents).toBe(800);
    expect(data.payer.consumedCents).toBe(266);
    expect(data.people.find((person) => person.participantId === "tiago")?.consumedCents).toBe(267);
    expect(data.people.find((person) => person.participantId === "rodrigo")?.consumedCents).toBe(267);
  });

  it("includes even, shares, and percent item breakdown rows", () => {
    const participants = [
      { id: "ana", name: "Ana" },
      { id: "bruno", name: "Bruno" }
    ];

    const data = buildPdfExportData(
      buildValues({
        participants,
        payerParticipantId: "ana",
        items: [
          {
            ...createEmptyItem(participants),
            id: "even-item",
            name: "Milk",
            price: "4.00"
          },
          {
            ...createEmptyItem(participants),
            id: "shares-item",
            name: "Cheese",
            price: "3.00",
            splitMode: "shares",
            allocations: [
              { participantId: "ana", evenIncluded: true, shares: "2", percent: "50" },
              { participantId: "bruno", evenIncluded: true, shares: "1", percent: "50" }
            ]
          },
          {
            ...createEmptyItem(participants),
            id: "percent-item",
            name: "Juice",
            price: "5.00",
            splitMode: "percent",
            allocations: [
              { participantId: "ana", evenIncluded: true, shares: "1", percent: "20" },
              { participantId: "bruno", evenIncluded: true, shares: "1", percent: "80" }
            ]
          }
        ]
      }),
      new Date("2026-03-09T12:00:00Z")
    );

    expect(data.items.map((item) => item.splitModeLabel)).toEqual(["Even split", "Share units", "Percent"]);
    expect(data.items[0]?.shares).toHaveLength(2);
    expect(data.items[1]?.shares).toEqual([
      { participantId: "ana", name: "Ana", amountCents: 200 },
      { participantId: "bruno", name: "Bruno", amountCents: 100 }
    ]);
    expect(data.items[2]?.shares).toEqual([
      { participantId: "ana", name: "Ana", amountCents: 100 },
      { participantId: "bruno", name: "Bruno", amountCents: 400 }
    ]);
  });

  it("builds a deterministic filename", () => {
    expect(buildPdfFilename(new Date("2026-03-09T12:00:00Z"))).toBe("split-bill-2026-03-09.pdf");
  });
});
