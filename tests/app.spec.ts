import { expect, test } from "@playwright/test";

test("splits a simple grocery receipt", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("button", { name: "Start splitting" }).click();
  await page.getByLabel("Add participant").fill("Ana");
  await page.getByRole("button", { name: "Add" }).click();
  await page.getByLabel("Add participant").fill("Bruno");
  await page.getByRole("button", { name: "Add" }).click();

  await page.getByRole("button", { name: "Continue" }).last().click();
  await page.getByRole("button", { name: "Add item" }).last().click();
  await page.getByLabel("Item name").fill("Milk");
  await page.getByLabel("Price").fill("5.00");

  await page.getByRole("button", { name: "Continue" }).last().click();
  await expect(page.getByText(/2\.50/).first()).toBeVisible();
  await page.getByRole("button", { name: "Continue" }).last().click();

  await expect(page.getByText("Final balances")).toBeVisible();
  await expect(page.getByText("Bruno")).toBeVisible();
  await expect(page.getByText(/Total receipt: .*5\.00/)).toBeVisible();

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export PDF" }).click();
  const download = await downloadPromise;

  expect(download.suggestedFilename()).toMatch(/^split-bill-\d{4}-\d{2}-\d{2}\.pdf$/);
});
