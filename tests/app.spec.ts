import { expect, test } from "@playwright/test";

test("splits a simple grocery receipt", async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.clear();
    window.__openedUrls = [] as string[];
    window.open = ((url?: string | URL) => {
      if (typeof url === "string") {
        window.__openedUrls.push(url);
      } else if (url) {
        window.__openedUrls.push(url.toString());
      }
      return null;
    }) as typeof window.open;
    window.__splitBillReceiptImportMock = async () => ({
      source: "image",
      fileName: "receipt.png",
      rawText: "Apples 2.49\nBread 1.20",
      items: [
        { name: "Apples", price: "2.49" },
        { name: "Bread", price: "1.20" }
      ],
      warnings: [{ code: "ignored-summary-lines", message: "Ignored 1 total or payment lines." }]
    });
  });

  await page.goto("/");

  await page.getByRole("button", { name: "Start splitting" }).click();
  await page.getByLabel("Add participant").fill("Ana");
  await page.getByRole("button", { name: "Add" }).click();
  await page.getByLabel("Add participant").fill("Bruno");
  await page.getByRole("button", { name: "Add" }).click();

  await page.getByRole("button", { name: "Continue" }).last().click();
  await page.getByRole("button", { name: "Add item" }).last().click();
  await page.getByRole("textbox", { name: "Item name" }).fill("Milk");
  await page.getByRole("textbox", { name: "Price" }).fill("5.00");
  const fileChooserPromise = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: "Import receipt" }).click();
  const fileChooser = await fileChooserPromise;
  await fileChooser.setFiles({
    name: "receipt.png",
    mimeType: "image/png",
    buffer: Buffer.from("mock-receipt")
  });
  await page.getByRole("button", { name: "Apply import" }).click();
  await expect(page.getByText(/Imported 2 items from receipt\.png/)).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Item name" }).nth(1)).toHaveValue("Apples");
  await expect(page.getByRole("textbox", { name: "Item name" }).nth(2)).toHaveValue("Bread");

  await page.getByRole("button", { name: "Continue" }).last().click();
  await expect(page.getByText(/2\.50/).first()).toBeVisible();
  await page.getByRole("button", { name: "Continue" }).last().click();

  await expect(page.getByText("Final balances")).toBeVisible();
  await expect(page.getByText("Bruno")).toBeVisible();
  await expect(page.getByRole("button", { name: "Copy summary" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Export PDF" })).toBeVisible();

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export PDF" }).click();
  const download = await downloadPromise;

  expect(download.suggestedFilename()).toMatch(/^split-bill-\d{4}-\d{2}-\d{2}\.pdf$/);
});

test("supports ai handoff and pasted import replacement", async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.clear();
    window.__openedUrls = [] as string[];
    window.open = ((url?: string | URL) => {
      if (typeof url === "string") {
        window.__openedUrls.push(url);
      } else if (url) {
        window.__openedUrls.push(url.toString());
      }
      return null;
    }) as typeof window.open;
  });

  await page.goto("/");

  await page.getByRole("button", { name: "Start splitting" }).click();
  await page.getByLabel("Add participant").fill("Ana");
  await page.getByRole("button", { name: "Add" }).click();
  await page.getByLabel("Add participant").fill("Bruno");
  await page.getByRole("button", { name: "Add" }).click();
  await page.getByRole("button", { name: "Continue" }).last().click();

  await page.getByRole("button", { name: "Ask AI" }).click();
  await expect(page.getByRole("textbox", { name: "Prompt" })).toHaveValue(
    /Read the uploaded grocery receipt/
  );
  await page.getByRole("button", { name: "ChatGPT" }).click();
  await expect
    .poll(async () => page.evaluate(() => (window as typeof window & { __openedUrls: string[] }).__openedUrls))
    .toContain("https://chatgpt.com/");

  await expect(page.getByLabel("Pasted items")).toBeVisible();
  await page.getByRole("button", { name: "Cancel" }).click();
  await page.getByRole("button", { name: "Add item" }).last().click();
  await page.getByRole("textbox", { name: "Item name" }).fill("Milk");
  await page.getByRole("textbox", { name: "Price" }).fill("5.00");
  await page.getByRole("button", { name: "Paste list" }).click();
  await page.getByLabel("Pasted items").fill("Bananas - 2.49\nBread,1.20");
  await page.getByRole("button", { name: "Import pasted list" }).click();
  await page.getByRole("radio", { name: "Replace current items" }).check();
  await page.getByRole("button", { name: "Apply import" }).click();

  await expect(page.getByRole("textbox", { name: "Item name" }).first()).toHaveValue("Bananas");
  await expect(page.getByRole("textbox", { name: "Item name" }).nth(1)).toHaveValue("Bread");
});
