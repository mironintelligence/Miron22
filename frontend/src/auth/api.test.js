import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";

import {
  apiDetailMessage,
  readCsrfToken,
  registerAccessTokenGetter,
  registerAccessTokenSetter,
} from "./api.js";

describe("apiDetailMessage", () => {
  it("düz string detail'i aynen döndürür", () => {
    expect(apiDetailMessage({ detail: "boom" })).toBe("boom");
  });

  it("dizi biçimindeki pydantic hatalarını birleştirir", () => {
    const out = apiDetailMessage({
      detail: [
        { msg: "field required" },
        { msg: "invalid email" },
        "extra",
      ],
    });
    expect(out).toContain("field required");
    expect(out).toContain("invalid email");
    expect(out).toContain("extra");
    expect(out.split("; ").length).toBe(3);
  });

  it("object biçimindeki detail için message alanını kullanır", () => {
    expect(apiDetailMessage({ detail: { message: "nope" } })).toBe("nope");
  });

  it("detail yoksa jenerik hata döndürür", () => {
    expect(apiDetailMessage({})).toBe("İstek başarısız");
    expect(apiDetailMessage(null)).toBe("İstek başarısız");
    expect(apiDetailMessage(undefined)).toBe("İstek başarısız");
  });

  it("yeni error envelope'la geriye uyumludur (code alanı varken)", () => {
    expect(
      apiDetailMessage({ code: "NOT_FOUND", detail: "yok", request_id: "r1" })
    ).toBe("yok");
  });
});

describe("readCsrfToken", () => {
  const originalDocument = global.document;

  beforeEach(() => {
    Object.defineProperty(global, "document", {
      configurable: true,
      value: { cookie: "" },
    });
  });

  afterEach(() => {
    Object.defineProperty(global, "document", {
      configurable: true,
      value: originalDocument,
    });
  });

  it("csrf_token cookie yoksa boş string döndürür", () => {
    document.cookie = "session=abc; other=1";
    expect(readCsrfToken()).toBe("");
  });

  it("cookie'den csrf_token'ı decode ederek okur", () => {
    document.cookie = "x=1; csrf_token=hello%20world; y=2";
    expect(readCsrfToken()).toBe("hello world");
  });

  it("csrf_token boş değerse boş string döndürür", () => {
    document.cookie = "csrf_token=";
    expect(readCsrfToken()).toBe("");
  });
});

describe("access token registrations", () => {
  it("setter/getter fonksiyon değilse no-op fallback kullanır (crash etmez)", () => {
    expect(() => registerAccessTokenGetter(null)).not.toThrow();
    expect(() => registerAccessTokenSetter(undefined)).not.toThrow();
    expect(() => registerAccessTokenGetter("not-a-fn")).not.toThrow();
  });
});
