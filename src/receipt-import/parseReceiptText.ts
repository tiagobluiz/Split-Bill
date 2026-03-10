import type { ReceiptImportItem, ReceiptImportWarning } from "./types";

const SUMMARY_KEYWORDS = [
  "total",
  "subtotal",
  "sub total",
  "amount due",
  "balance due",
  "tax",
  "vat",
  "iva",
  "cash",
  "change",
  "payment",
  "paid",
  "mastercard",
  "visa",
  "debit",
  "credit",
  "tender",
  "mbway",
  "multibanco",
  "terminal",
  "pay",
  "troco",
  "a pagar",
  "talão"
];

const MODIFIER_KEYWORDS = [
  "discount",
  "promo",
  "coupon",
  "offer",
  "desconto"
];

const IGNORE_MODIFIER_KEYWORDS = ["saving", "savings", "poupanca", "poupa"];

const NOTE_KEYWORDS = [
  "aprox",
  "validade",
  "cliente",
  "operador",
  "loja",
  "morada",
  "obrigado",
  "thank you",
  "www.",
  "tel.",
  "telefone",
  "nif"
];

const TRAILING_PRICE_PATTERN = /(-?\d[\d\s.,]*[.,]\d{2})\s*$/;
const QUANTITY_CONTINUATION_PATTERN =
  /^(?:\d+(?:[.,]\d+)?)\s*[xX]\s+(?<unit>\d[\d.,]*[.,]\d{2})(?:\s+(?<total>-?\d[\d.,]*[.,]\d{2}))?\s*$/;

type ParsedPriceCandidate = {
  rawPrice: string;
  namePart: string;
};

type ClassifiedLine =
  | { kind: "item"; name: string; amountCents: number }
  | { kind: "modifier"; name: string; amountCents: number }
  | { kind: "continuation"; amountCents: number }
  | { kind: "summary" | "header" | "note" | "description" | "unknown"; text: string };

function normalizeLine(line: string) {
  return line.replace(/\s+/g, " ").trim();
}

function stripTaxCodePrefix(line: string) {
  return normalizeLine(line.replace(/^\([A-Z]\)\s*/, ""));
}

function hasTaxCodePrefix(line: string) {
  return /^\([A-Z]\)\s*/.test(line);
}

function normalizeExtractedPrice(rawPrice: string) {
  const compact = rawPrice.replace(/\s/g, "");
  const lastComma = compact.lastIndexOf(",");
  const lastDot = compact.lastIndexOf(".");
  const decimalIndex = Math.max(lastComma, lastDot);

  if (decimalIndex < 0) {
    return compact;
  }

  const integerPart = compact.slice(0, decimalIndex).replace(/[.,]/g, "");
  const decimalPart = compact.slice(decimalIndex + 1);
  return `${integerPart}.${decimalPart}`;
}

function formatPriceString(amountCents: number) {
  const absolute = Math.abs(amountCents);
  const whole = Math.floor(absolute / 100);
  const cents = (absolute % 100).toString().padStart(2, "0");
  const sign = amountCents < 0 ? "-" : "";

  return `${sign}${whole}.${cents}`;
}

function parsePriceToCents(rawPrice: string) {
  const normalizedPrice = normalizeExtractedPrice(rawPrice);
  const numericPrice = Number(normalizedPrice);
  if (!Number.isFinite(numericPrice)) {
    return null;
  }

  return Math.round(numericPrice * 100);
}

function extractTrailingPrice(line: string): ParsedPriceCandidate | null {
  const match = line.match(TRAILING_PRICE_PATTERN);
  if (!match) {
    return null;
  }

  return {
    rawPrice: match[1],
    namePart: normalizeLine(line.slice(0, match.index))
  };
}

function cleanItemName(name: string) {
  return normalizeLine(name.replace(/^\([A-Z]\)\s*/, "").replace(/^[xX]\s+/, ""));
}

function normalizeKeywordText(text: string) {
  return text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}

function countLetters(text: string) {
  return (text.match(/[A-Za-zÀ-ÿ]/g) ?? []).length;
}

function countWords(text: string) {
  return text.split(/\s+/).filter(Boolean).length;
}

function hasSummaryKeyword(text: string) {
  const normalized = normalizeKeywordText(text);
  return SUMMARY_KEYWORDS.some((keyword) => normalized.includes(keyword));
}

function hasModifierKeyword(text: string) {
  const normalized = normalizeKeywordText(text);
  return MODIFIER_KEYWORDS.some((keyword) => normalized.includes(keyword));
}

function hasIgnoredModifierKeyword(text: string) {
  const normalized = normalizeKeywordText(text);
  return IGNORE_MODIFIER_KEYWORDS.some((keyword) => normalized.includes(keyword));
}

function hasNoteKeyword(text: string) {
  const normalized = normalizeKeywordText(text);
  return NOTE_KEYWORDS.some((keyword) => normalized.includes(keyword));
}

function isHeaderLine(text: string) {
  return text.endsWith(":");
}

function isLikelyNoteLine(text: string) {
  if (hasNoteKeyword(text)) {
    return true;
  }

  return /[.?!]$/.test(text) && text === text.toLowerCase() && countWords(text) >= 3;
}

function isLikelyDescriptionLine(text: string) {
  if (!text || isHeaderLine(text) || hasSummaryKeyword(text) || isLikelyNoteLine(text)) {
    return false;
  }

  if (countLetters(text) < 3) {
    return false;
  }

  return countWords(text) <= 10;
}

function isLikelySummaryLine(text: string) {
  if (hasSummaryKeyword(text)) {
    return true;
  }

  const numericGroups = text.match(/\d[\d.,]*/g) ?? [];
  return numericGroups.length >= 3 && countLetters(text) < 8;
}

function isVatDistributionName(text: string) {
  return /^\d{1,2}(?:[.,]\d{1,2})?%$/.test(text.trim());
}

function extractContinuationAmount(line: string) {
  const normalizedLine = stripTaxCodePrefix(line);
  const match = normalizedLine.match(QUANTITY_CONTINUATION_PATTERN);
  if (!match) {
    return null;
  }

  const rawPrice = match.groups?.total ?? match.groups?.unit;
  if (!rawPrice) {
    return null;
  }

  return parsePriceToCents(rawPrice);
}

function classifyUnpricedLine(line: string): ClassifiedLine {
  const text = stripTaxCodePrefix(line);

  if (!text) {
    return { kind: "unknown", text };
  }

  if (isHeaderLine(text)) {
    return { kind: "header", text };
  }

  if (isLikelySummaryLine(text)) {
    return { kind: "summary", text };
  }

  if (isLikelyNoteLine(text)) {
    return { kind: "note", text };
  }

  if (isLikelyDescriptionLine(text)) {
    return { kind: "description", text };
  }

  return { kind: "unknown", text };
}

function classifyPricedLine(line: string): ClassifiedLine {
  const taxPrefixed = hasTaxCodePrefix(line);
  const continuationAmount = extractContinuationAmount(line);
  if (continuationAmount !== null) {
    return { kind: "continuation", amountCents: continuationAmount };
  }

  const candidate = extractTrailingPrice(stripTaxCodePrefix(line));
  if (!candidate) {
    return classifyUnpricedLine(line);
  }

  const amountCents = parsePriceToCents(candidate.rawPrice);
  const name = cleanItemName(candidate.namePart);

  if (amountCents === null || amountCents === 0) {
    return { kind: "unknown", text: line };
  }

  if (!name) {
    return { kind: "summary", text: line };
  }

  if (isVatDistributionName(name) || hasIgnoredModifierKeyword(name) || isLikelySummaryLine(name)) {
    return { kind: "summary", text: line };
  }

  if (hasModifierKeyword(name)) {
    return {
      kind: "modifier",
      name,
      amountCents: -Math.abs(amountCents)
    };
  }

  if (taxPrefixed) {
    return {
      kind: "item",
      name,
      amountCents
    };
  }

  return {
    kind: "item",
    name,
    amountCents
  };
}

function mergeDescriptions(pendingDescription: string | null, nextDescription: string) {
  if (!pendingDescription) {
    return nextDescription;
  }

  return normalizeLine(`${pendingDescription} ${nextDescription}`);
}

function pushItem(items: ReceiptImportItem[], name: string, amountCents: number) {
  if (!name || amountCents === 0) {
    return;
  }

  items.push({
    name,
    price: formatPriceString(amountCents)
  });
}

export function parseReceiptText(rawText: string) {
  const warnings: ReceiptImportWarning[] = [];
  const items: ReceiptImportItem[] = [];
  const ignoredSummaryLines: string[] = [];
  let pendingDescription: string | null = null;

  const lines = rawText
    .split(/\r?\n/)
    .map(normalizeLine)
    .filter(Boolean);

  lines.forEach((line) => {
    const classifiedLine = classifyPricedLine(line);

    switch (classifiedLine.kind) {
      case "description":
        pendingDescription = mergeDescriptions(pendingDescription, classifiedLine.text);
        return;
      case "continuation":
        if (pendingDescription) {
          pushItem(items, pendingDescription, classifiedLine.amountCents);
          pendingDescription = null;
        }
        return;
      case "item": {
        const itemName = mergeDescriptions(pendingDescription, classifiedLine.name);
        pushItem(items, itemName, classifiedLine.amountCents);
        pendingDescription = null;
        return;
      }
      case "modifier":
        pushItem(items, classifiedLine.name, classifiedLine.amountCents);
        pendingDescription = null;
        return;
      case "summary":
        ignoredSummaryLines.push(line);
        pendingDescription = null;
        return;
      case "header":
      case "note":
        pendingDescription = null;
        return;
      case "unknown":
        return;
      default:
        return;
    }
  });

  if (ignoredSummaryLines.length > 0) {
    warnings.push({
      code: "ignored-summary-lines",
      message: `Ignored ${ignoredSummaryLines.length} total or payment lines.`
    });
  }

  if (items.length === 0) {
    warnings.push({
      code: "no-items-detected",
      message: "No probable receipt items were detected. Try a clearer photo or edit items manually."
    });
  }

  return {
    items,
    warnings
  };
}
