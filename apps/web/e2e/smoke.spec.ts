import { expect, test } from "@playwright/test";

test("トップページが表示される", async ({ page }) => {
  const response = await page.goto("/");
  expect(response?.ok()).toBe(true);
});
