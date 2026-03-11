import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import type { ReceiptImportResult } from "./types";
import { parseReceiptText } from "./parseReceiptText";

declare global {
  interface Window {
    __splitBillReceiptImportMock?: (file: File) => Promise<ReceiptImportResult> | ReceiptImportResult;
  }
}

function isPdfFile(file: File) {
  return file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
}

type PdfTextItem = {
  str?: string;
  hasEOL?: boolean;
  transform?: number[];
};

async function recognizeWithTesseract(input: HTMLCanvasElement | File) {
  const { createWorker } = await import("tesseract.js");
  const worker = await createWorker("eng");

  try {
    const result = await worker.recognize(input);
    return result.data.text;
  } finally {
    await worker.terminate();
  }
}

async function loadPdfDocument(file: File) {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

  const buffer = await file.arrayBuffer();
  const task = pdfjs.getDocument({ data: buffer });
  return task.promise;
}

function flushPdfLine(lines: string[], tokens: string[]) {
  if (tokens.length === 0) {
    return;
  }

  const nextLine = tokens.join(" ").replace(/\s+/g, " ").trim();
  if (nextLine) {
    lines.push(nextLine);
  }
  tokens.length = 0;
}

export function buildLinesFromPdfTextItems(items: PdfTextItem[]) {
  const lines: string[] = [];
  const currentTokens: string[] = [];
  let currentY: number | null = null;

  items.forEach((item) => {
    const token = item.str?.replace(/\s+/g, " ").trim() ?? "";
    const itemY = Array.isArray(item.transform) ? item.transform[5] : null;
    const shouldBreakLine =
      currentTokens.length > 0 &&
      typeof itemY === "number" &&
      typeof currentY === "number" &&
      Math.abs(itemY - currentY) > 1.5;

    if (shouldBreakLine) {
      flushPdfLine(lines, currentTokens);
    }

    if (token) {
      currentTokens.push(token);
    }

    if (typeof itemY === "number") {
      currentY = itemY;
    }

    if (item.hasEOL) {
      flushPdfLine(lines, currentTokens);
      currentY = null;
    }
  });

  flushPdfLine(lines, currentTokens);
  return lines;
}

async function extractEmbeddedTextFromPdf(file: File) {
  const document = await loadPdfDocument(file);
  const pageTexts: string[] = [];

  try {
    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
      const page = await document.getPage(pageNumber);
      const content = await page.getTextContent();
      const pageLines = buildLinesFromPdfTextItems(content.items as PdfTextItem[]);
      pageTexts.push(...pageLines);
    }

    return pageTexts.join("\n");
  } finally {
    await document.destroy();
  }
}

async function extractOcrTextFromPdf(file: File) {
  const document = await loadPdfDocument(file);
  const pageTexts: string[] = [];

  try {
    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
      const page = await document.getPage(pageNumber);
      const viewport = page.getViewport({ scale: 2 });
      const canvas = window.document.createElement("canvas");
      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);
      const context = canvas.getContext("2d");

      if (!context) {
        throw new Error("Could not create canvas context for PDF parsing.");
      }

      await page.render({
        canvas,
        canvasContext: context,
        viewport
      }).promise;

      pageTexts.push(await recognizeWithTesseract(canvas));
      context.clearRect(0, 0, canvas.width, canvas.height);
      canvas.width = 0;
      canvas.height = 0;
      page.cleanup();
    }

    return pageTexts.join("\n");
  } finally {
    await document.destroy();
  }
}

export async function importReceipt(file: File): Promise<ReceiptImportResult> {
  if (window.__splitBillReceiptImportMock) {
    return Promise.resolve(window.__splitBillReceiptImportMock(file));
  }

  const source = isPdfFile(file) ? "pdf" : "image";
  let rawText = "";
  let parsed: ReturnType<typeof parseReceiptText> = { items: [], warnings: [] };

  if (source === "pdf") {
    rawText = await extractEmbeddedTextFromPdf(file);
    parsed = parseReceiptText(rawText);

    if (parsed.items.length === 0) {
      rawText = await extractOcrTextFromPdf(file);
      const fallbackParsed = parseReceiptText(rawText);
      parsed = {
        ...fallbackParsed,
        warnings: [
          {
            code: "ocr-fallback",
            message: "Used OCR fallback because the PDF text layer did not yield any probable items."
          },
          ...fallbackParsed.warnings
        ]
      };
    }
  } else {
    rawText = await recognizeWithTesseract(file);
    parsed = parseReceiptText(rawText);
  }

  if (parsed.items.length === 0) {
    const warningSummary = parsed.warnings.map((warning) => warning.message).join(" ");
    const rawTextPreview = rawText.replace(/\s+/g, " ").trim().slice(0, 160);
    const diagnosticMessage = warningSummary || "No receipt items could be detected.";
    const previewSuffix = rawTextPreview ? ` Raw text preview: ${rawTextPreview}` : "";

    throw new Error(`${diagnosticMessage}${previewSuffix}`);
  }

  return {
    source,
    fileName: file.name,
    rawText,
    items: parsed.items,
    warnings: parsed.warnings
  };
}
