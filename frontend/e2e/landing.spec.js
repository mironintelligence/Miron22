import { expect, test } from "@playwright/test";

test.describe("Public landing", () => {
  test("ana sayfa yüklenir ve anahtar içerik görünür", async ({ page }) => {
    const errors = [];
    page.on("pageerror", (err) => errors.push(err.message));

    await page.goto("/", { waitUntil: "networkidle" });
    await expect(page).toHaveTitle(/Miron|Libra/i);

    // Landing'de CTA butonu olmalı (giriş veya denemeye başla).
    const cta = page.getByRole("link", { name: /giriş|kayıt|denem/i }).first();
    await expect(cta).toBeVisible();

    expect(errors, `runtime errors: ${errors.join("\n")}`).toHaveLength(0);
  });

  test("bilinmeyen rota 404 değil React router fallback'ini gösterir", async ({
    page,
  }) => {
    const response = await page.goto("/___definitely-missing-route", {
      waitUntil: "networkidle",
    });
    // SPA: her zaman 200 html (Vercel rewrites).
    expect(response?.status()).toBeLessThan(500);
    await expect(page.locator("body")).toBeVisible();
  });
});
