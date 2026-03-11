import { describe, expect, it } from "vitest";
import { buildReceiptLlmPrompt, getReceiptLlmProviderUrl } from "./llmHandoff";

describe("llmHandoff", () => {
  it("builds a strict prompt for receipt extraction", () => {
    const prompt = buildReceiptLlmPrompt();

    expect(prompt).toContain("Item name - 2.49");
    expect(prompt).toContain("Exclude totals, subtotals, taxes, VAT summaries, payment lines");
    expect(prompt).toContain("Do not add commentary, numbering, markdown, tables, or explanations.");
  });

  it("maps supported providers to stable launch urls", () => {
    expect(getReceiptLlmProviderUrl("chatgpt")).toBe("https://chatgpt.com/");
    expect(getReceiptLlmProviderUrl("claude")).toBe("https://claude.ai/");
    expect(getReceiptLlmProviderUrl("gemini")).toBe("https://gemini.google.com/app");
  });
});
