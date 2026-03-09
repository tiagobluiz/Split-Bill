import { createElement } from "react";
import type { SplitFormValues } from "../domain/splitter";
import { buildPdfExportData } from "./buildPdfExportData";

export async function exportSettlementPdf(values: SplitFormValues): Promise<void> {
  const [{ pdf }, { SettlementPdfDocument }] = await Promise.all([
    import("@react-pdf/renderer"),
    import("./SettlementPdfDocument")
  ]);

  const exportData = buildPdfExportData(values);
  const instance = pdf();
  instance.updateContainer(createElement(SettlementPdfDocument, { data: exportData }));
  const blob = await instance.toBlob();
  const url = URL.createObjectURL(blob);

  try {
    const link = window.document.createElement("a");
    link.href = url;
    link.download = exportData.fileName;
    link.click();
  } finally {
    window.setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 1000);
  }
}
