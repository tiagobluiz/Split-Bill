# Receipt Import Plan

## Summary
- Add a browser-only receipt import flow to Step 2 that accepts images and PDFs, extracts grocery lines with OCR plus deterministic parsing, and appends editable items into the existing list.
- Do not use LLMs, external AI APIs, or backend services. The implementation stays FE-only.
- Treat imported results as best effort: users always review and edit before continuing.

## Key Changes
- Step 2 UX:
  - Add an `Import receipt` action near `Add item`.
  - Support file selection for common image formats and PDFs.
  - Show import states: idle, reading file, OCR/parsing, success summary, and failure/retry.
  - Append detected items into the current manual list instead of replacing it.
  - Keep all imported rows fully editable and reorderable with the existing Step 2 behavior.
- Parsing pipeline:
  - Images: preprocess client-side where useful, then run OCR in-browser.
  - PDFs: render each page client-side to an image/canvas, then OCR page-by-page.
  - Parse OCR text with rule-based receipt heuristics:
    - detect probable item lines
    - extract trailing prices
    - ignore obvious totals/subtotals/tax/payment lines
    - keep discounts as negative lines when identifiable
  - Normalize imported rows into the existing `item name` + `price` shape.
- Reliability model:
  - Best effort for arbitrary supermarket receipts, not store-specific templates.
  - Importer should prefer false negatives over false positives for payment-summary lines.
  - Always surface a concise note that imported data may need manual cleanup.
- Technical shape:
  - Add a dedicated receipt-import module with:
    - file ingestion
    - PDF page extraction
    - OCR adapter
    - text-to-items parser
  - Keep Step 2 form state unchanged; imported rows are converted into existing item rows and appended through current form/update paths.
  - Load OCR/PDF parsing dependencies lazily only when the user imports a receipt.

## Public Interfaces And Types
- Add frontend-only import models, for example:
  - `ReceiptImportResult`
  - `ReceiptImportItem`
  - `ReceiptImportWarning`
- Add a Step 2 import entrypoint, for example:
  - `importReceipt(file: File): Promise<ReceiptImportResult>`
- Extend item creation flow to support an appended batch of imported items without introducing a new persisted schema.

## Test Plan
- Unit tests for parsing heuristics:
  - standard item lines with trailing prices
  - discounts as negative rows
  - totals/subtotals/tax/payment lines excluded
  - malformed OCR text ignored safely
  - mixed decimal separators handled correctly
- Component and integration tests:
  - Step 2 shows `Import receipt`
  - image import appends detected items without clearing manual items
  - failed import shows recoverable error state
  - imported items remain editable, deletable, and reorderable
- PDF-specific tests:
  - multi-page PDF path runs page extraction and OCR pipeline
  - combined page results append into one item list
- E2E tests:
  - import a fixture receipt, confirm rows appear, edit one imported row, continue to Step 3 successfully
- Regression checks:
  - manual item entry remains unchanged
  - Enter-to-add behavior in Step 2 still works
  - existing Step 3 and Step 4 math is unaffected by imported rows

## Assumptions
- FE-only remains a hard constraint: no backend OCR and no third-party AI services.
- V1 supports images and PDFs.
- Import is append-only, not replace or preview-before-apply.
- Accuracy target is useful autofill with review, not fully automatic trusted extraction.
