import { expect, test } from "@playwright/test";

/**
 * Backend contract smoke tests. Runs against whatever API the frontend
 * build is pointed at (VITE_API_BASE_URL baked in at build time).
 *
 * We don't exercise authenticated endpoints here — those need seed data.
 * This tier is meant to catch "CORS is misconfigured / health is 500 /
 * error envelope shape regressed" before they reach a human.
 */

test.describe("API smoke", () => {
  test("/health 200 + JSON { ok: true }", async ({ request, baseURL }) => {
    const apiBase = process.env.PW_API_BASE_URL || baseURL;
    const res = await request.get(`${apiBase}/health`);
    expect(res.status(), await res.text()).toBe(200);
    const body = await res.json();
    expect(body).toMatchObject({ ok: true });
  });

  test("hatalı route 404 + yeni error envelope şeması döndürür", async ({
    request,
  }) => {
    const apiBase = process.env.PW_API_BASE_URL;
    test.skip(
      !apiBase,
      "PW_API_BASE_URL verilmezse frontend origin'ine yönlenir, envelope testi anlamsız."
    );
    const res = await request.get(`${apiBase}/__does-not-exist__`);
    expect(res.status()).toBe(404);
    const body = await res.json();
    // error_codes.build_envelope çıktısı: { code, detail, request_id? }
    expect(body).toHaveProperty("code");
    expect(body).toHaveProperty("detail");
    expect(typeof body.code).toBe("string");
  });
});
