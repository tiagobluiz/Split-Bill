import { describe, expect, it } from "vitest";
import {
  computeSettlement,
  createDefaultPercentValues,
  createEmptyItem,
  rebalancePercentAllocations,
  type SplitFormValues
} from "./splitter";

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

  it("balances leftover cents across the final bill instead of repeating the same item-level bias", () => {
    const participants = [
      { id: "ana", name: "Ana" },
      { id: "tiago", name: "Tiago" },
      { id: "rodrigo", name: "Rodrigo" }
    ];

    const values = buildValues({
      participants,
      payerParticipantId: "ana",
      items: Array.from({ length: 8 }, (_, index) => ({
        ...createEmptyItem(participants),
        id: `item-${index + 1}`,
        name: `Item ${index + 1}`,
        price: "1.00"
      }))
    });

    const result = computeSettlement(values);

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    const ana = result.data.people.find((person) => person.participantId === "ana");
    const tiago = result.data.people.find((person) => person.participantId === "tiago");
    const rodrigo = result.data.people.find((person) => person.participantId === "rodrigo");

    expect(ana?.consumedCents).toBe(266);
    expect(tiago?.consumedCents).toBe(267);
    expect(rodrigo?.consumedCents).toBe(267);
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

  it("creates default percent values that sum to exactly 100", () => {
    expect(createDefaultPercentValues(3)).toEqual(["33.34", "33.33", "33.33"]);
    expect(createDefaultPercentValues(4)).toEqual(["25", "25", "25", "25"]);
  });

  it("rebalances percent edits across the remaining unlocked participants", () => {
    const firstPass = rebalancePercentAllocations(
      [
        { participantId: "ana", evenIncluded: true, shares: "1", percent: "25", percentLocked: false },
        { participantId: "bruno", evenIncluded: true, shares: "1", percent: "25", percentLocked: false },
        { participantId: "carla", evenIncluded: true, shares: "1", percent: "25", percentLocked: false },
        { participantId: "dina", evenIncluded: true, shares: "1", percent: "25", percentLocked: false }
      ],
      "carla",
      "50"
    );

    expect(firstPass).not.toBeNull();
    expect(firstPass?.find((entry) => entry.participantId === "carla")?.percent).toBe("50");

    const secondPass = rebalancePercentAllocations(firstPass ?? [], "ana", "20");

    expect(secondPass).not.toBeNull();
    expect(secondPass).toEqual([
      { participantId: "ana", evenIncluded: true, shares: "1", percent: "20", percentLocked: true },
      { participantId: "bruno", evenIncluded: true, shares: "1", percent: "15", percentLocked: false },
      { participantId: "carla", evenIncluded: true, shares: "1", percent: "50", percentLocked: true },
      { participantId: "dina", evenIncluded: true, shares: "1", percent: "15", percentLocked: false }
    ]);
  });
});
