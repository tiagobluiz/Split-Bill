import { describe, expect, it } from "vitest";
import { computeSettlement, createEmptyItem, type SplitFormValues } from "./splitter";

function buildValues(values: Partial<SplitFormValues>): SplitFormValues {
  return {
    currency: "EUR",
    participants: [],
    payerParticipantId: "",
    items: [],
    ...values
  };
}

describe("splitter", () => {
  it("splits evenly across included participants", () => {
    const participants = [
      { id: "ana", name: "Ana" },
      { id: "bruno", name: "Bruno" }
    ];
    const values = buildValues({
      participants,
      payerParticipantId: "ana",
      items: [
        {
          ...createEmptyItem(participants),
          name: "Pasta",
          price: "6.00"
        }
      ]
    });

    const result = computeSettlement(values);

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.data.transfers).toEqual([
      {
        fromParticipantId: "bruno",
        fromName: "Bruno",
        toParticipantId: "ana",
        toName: "Ana",
        amountCents: 300
      }
    ]);
  });

  it("uses share ratios and keeps the payer away from the rounding burden", () => {
    const values = buildValues({
      participants: [
        { id: "ana", name: "Ana" },
        { id: "bruno", name: "Bruno" },
        { id: "carla", name: "Carla" }
      ],
      payerParticipantId: "ana",
      items: [
        {
          id: "item-1",
          name: "Cheese",
          price: "1.00",
          splitMode: "shares",
          allocations: [
            { participantId: "ana", evenIncluded: true, shares: "1", percent: "33.33" },
            { participantId: "bruno", evenIncluded: true, shares: "1", percent: "33.33" },
            { participantId: "carla", evenIncluded: true, shares: "1", percent: "33.33" }
          ]
        }
      ]
    });

    const result = computeSettlement(values);

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    const ana = result.data.people.find((person) => person.participantId === "ana");
    const bruno = result.data.people.find((person) => person.participantId === "bruno");
    const carla = result.data.people.find((person) => person.participantId === "carla");

    expect(ana?.consumedCents).toBe(33);
    expect(bruno?.consumedCents).toBe(34);
    expect(carla?.consumedCents).toBe(33);
  });

  it("rejects invalid percent totals", () => {
    const values = buildValues({
      participants: [
        { id: "ana", name: "Ana" },
        { id: "bruno", name: "Bruno" }
      ],
      payerParticipantId: "ana",
      items: [
        {
          id: "item-1",
          name: "Juice",
          price: "4.00",
          splitMode: "percent",
          allocations: [
            { participantId: "ana", evenIncluded: true, shares: "1", percent: "40" },
            { participantId: "bruno", evenIncluded: true, shares: "1", percent: "40" }
          ]
        }
      ]
    });

    const result = computeSettlement(values);

    expect(result.ok).toBe(false);
  });
});
