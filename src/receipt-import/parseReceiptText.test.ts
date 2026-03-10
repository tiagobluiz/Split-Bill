import { describe, expect, it } from "vitest";
import { parseReceiptText } from "./parseReceiptText";

describe("parseReceiptText", () => {
  it("extracts standard item lines with trailing prices", () => {
    const result = parseReceiptText(`
      BANANAS 1.99
      TOMATOES 2.49
    `);

    expect(result.items).toEqual([
      { name: "BANANAS", price: "1.99" },
      { name: "TOMATOES", price: "2.49" }
    ]);
  });

  it("turns discount lines into negative rows", () => {
    const result = parseReceiptText(`
      Pasta 3.50
      Promo discount 0.75
    `);

    expect(result.items).toEqual([
      { name: "Pasta", price: "3.50" },
      { name: "Promo discount", price: "-0.75" }
    ]);
  });

  it("ignores total and payment lines", () => {
    const result = parseReceiptText(`
      Apples 2.00
      Subtotal 2.00
      Total 2.00
      Paid cash 2.00
    `);

    expect(result.items).toEqual([{ name: "Apples", price: "2.00" }]);
    expect(result.warnings.some((warning) => warning.code === "ignored-summary-lines")).toBe(true);
  });

  it("supports mixed decimal separators and thousands cleanup", () => {
    const result = parseReceiptText(`
      Olive Oil 1.234,56
      Cheese 12,30
    `);

    expect(result.items).toEqual([
      { name: "Olive Oil", price: "1234.56" },
      { name: "Cheese", price: "12.30" }
    ]);
  });

  it("warns when no probable items are found", () => {
    const result = parseReceiptText(`
      TOTAL 8.99
      VISA 8.99
    `);

    expect(result.items).toEqual([]);
    expect(result.warnings.some((warning) => warning.code === "no-items-detected")).toBe(true);
  });

  it("merges wrapped supermarket item descriptions with quantity continuation lines", () => {
    const result = parseReceiptText(`
      Mercearia Doce:
      (C) BOL GULLON AVELA 220G
      2 X 1,49 2,98
      (C) NUGGETS FRANGO CAPITAO IGLO 50U 12,99
    `);

    expect(result.items).toEqual([
      { name: "BOL GULLON AVELA 220G", price: "2.98" },
      { name: "NUGGETS FRANGO CAPITAO IGLO 50U", price: "12.99" }
    ]);
  });

  it("ignores supermarket headers and note lines without treating them as items", () => {
    const result = parseReceiptText(`
      Padaria:
      Aprox. fim prazo validade
      Pao de forma 2,19
    `);

    expect(result.items).toEqual([{ name: "Pao de forma", price: "2.19" }]);
  });

  it("ignores savings-only lines such as poupanca metadata", () => {
    const result = parseReceiptText(`
      Iogurte 3,49
      POUPANCA 1,20
    `);

    expect(result.items).toEqual([{ name: "Iogurte", price: "3.49" }]);
  });

  it("ignores vat distribution footer rows", () => {
    const result = parseReceiptText(`
      (C) BOL GULLON AVELA 220G 1,49
      6,00% 30 431,83
      13,00% 1530,20
      23,00% 155 335 719,10
    `);

    expect(result.items).toEqual([{ name: "BOL GULLON AVELA 220G", price: "1.49" }]);
  });

  it("ignores portuguese summary and payment footer blocks", () => {
    const result = parseReceiptText(`
      BOL DIGESTIVE AVEIA CHOCO CNT 1,79
      SUBTOTAL 64,31
      TOTAL A PAGAR 53,09
      Continente Pay (**** 3879) 53,09
    `);

    expect(result.items).toEqual([{ name: "BOL DIGESTIVE AVEIA CHOCO CNT", price: "1.79" }]);
    expect(result.warnings).toContainEqual({
      code: "ignored-summary-lines",
      message: "Ignored 3 total or payment lines."
    });
  });
});
