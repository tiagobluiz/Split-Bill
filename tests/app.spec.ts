import { expect, test } from "@playwright/test";

test("splits a simple grocery receipt", async ({ page }) => {
  await page.goto("/");

  await page.getByLabel("Currency").fill("EUR");
  await page.getByLabel("Add participant").fill("Ana");
  await page.getByRole("button", { name: "Add" }).click();
  await page.getByLabel("Add participant").fill("Bruno");
  await page.getByRole("button", { name: "Add" }).click();

  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "Add item" }).click();
  await page.getByLabel("Item name").fill("Milk");
  await page.getByLabel("Price").fill("5.00");

  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "Included" }).first().click();
  await page.getByRole("button", { name: "Continue" }).click();

  await expect(page.getByText("Bruno pays Ana €5.00")).toBeVisible();
});
