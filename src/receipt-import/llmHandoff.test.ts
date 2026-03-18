import { describe, expect, it } from "vitest";
import {
  buildReceiptLlmPrompt,
  getReceiptLlmLaunchTarget,
  getReceiptLlmProviderUrl,
  isMobileUserAgent
} from "./llmHandoff";

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
    expect(getReceiptLlmProviderUrl("gemini", true)).toBe("https://gemini.google.com/");
  });

  it("detects mobile user agents and chooses a mobile-safe launch target", () => {
    expect(isMobileUserAgent("Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)")).toBe(true);
    expect(isMobileUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64)")).toBe(false);
    expect(getReceiptLlmLaunchTarget(true)).toBe("_self");
    expect(getReceiptLlmLaunchTarget(false)).toBe("_blank");
  });
});
