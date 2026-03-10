export type ReceiptImportItem = {
  name: string;
  price: string;
};

export type ReceiptImportWarning = {
  code: string;
  message: string;
};

export type ReceiptImportResult = {
  source: "image" | "pdf";
  fileName: string;
  rawText: string;
  items: ReceiptImportItem[];
  warnings: ReceiptImportWarning[];
};
