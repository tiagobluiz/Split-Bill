import { describe, expect, it } from "vitest";
import { buildLinesFromPdfTextItems } from "./importReceipt";

describe("buildLinesFromPdfTextItems", () => {
  it("keeps the trailing price on the same line when the last token has hasEOL", () => {
    const lines = buildLinesFromPdfTextItems([
      { str: "(C)", transform: [0, 0, 0, 0, 5, 825.25], hasEOL: false },
      { str: "BOL DIGESTIVE AVEIA CHOCO CNT", transform: [0, 0, 0, 0, 23, 825.25], hasEOL: false },
      { str: "1,79", transform: [0, 0, 0, 0, 203, 825.25], hasEOL: true },
      { str: "(C)", transform: [0, 0, 0, 0, 5, 817.75], hasEOL: false },
      { str: "BOL GULLON AVELA 220G", transform: [0, 0, 0, 0, 23, 817.75], hasEOL: true },
      { str: "2 X 1,49", transform: [0, 0, 0, 0, 31, 810.25], hasEOL: false },
      { str: "2,98", transform: [0, 0, 0, 0, 203, 810.25], hasEOL: true }
    ]);

    expect(lines).toEqual([
      "(C) BOL DIGESTIVE AVEIA CHOCO CNT 1,79",
      "(C) BOL GULLON AVELA 220G",
      "2 X 1,49 2,98"
    ]);
  });
});
