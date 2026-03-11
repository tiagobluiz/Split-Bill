import { describe, expect, it } from "vitest";
import { parsePastedItems } from "./parsePastedItems";

describe("parsePastedItems", () => {
  it("accepts friendly plain text lines", () => {
    const result = parsePastedItems(`
      Bananas - 2.49
      Tomatoes: 1.80
      Yogurt 2.10
      1. Milk - 3,40 EUR
      - Bread - 1.20
    `);

    expect(result.items).toEqual([
      { name: "Bananas", price: "2.49" },
      { name: "Tomatoes", price: "1.80" },
      { name: "Yogurt", price: "2.10" },
      { name: "Milk", price: "3.40" },
      { name: "Bread", price: "1.20" }
    ]);
  });

  it("accepts simple csv as a fallback", () => {
    const result = parsePastedItems(`
      item,price
      Bananas,2.49
      Bread,1.20
    `);

    expect(result.items).toEqual([
      { name: "Bananas", price: "2.49" },
      { name: "Bread", price: "1.20" }
    ]);
  });

  it("reports ignored malformed lines", () => {
    const result = parsePastedItems(`
      Bananas - 2.49
      total 5.00
      ????
    `);

    expect(result.items).toEqual([{ name: "Bananas", price: "2.49" }]);
    expect(result.ignoredLines).toEqual(["total 5.00", "????"]);
    expect(result.warnings).toContainEqual({
      code: "ignored-paste-lines",
      message: "Ignored 2 pasted lines that did not match the expected format."
    });
  });

  it("warns when nothing valid is parsed", () => {
    const result = parsePastedItems("hello world");

    expect(result.items).toEqual([]);
    expect(result.warnings).toContainEqual({
      code: "no-items-detected",
      message: "No valid items were detected. Use lines like `Bananas - 2.49`, `Bananas 2.49`, or `item,price`."
    });
  });
});
