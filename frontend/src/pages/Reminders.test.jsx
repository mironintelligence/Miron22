import React from "react";
import { describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "vitest-axe";

import Reminders from "./Reminders.jsx";

vi.mock("../auth/api", () => ({
  authFetch: vi.fn(async (path, init) => {
    if (String(path).startsWith("/api/reminders") && (!init || init.method === "GET")) {
      return new Response(JSON.stringify([]), { status: 200 });
    }
    if (String(path).startsWith("/api/reminders") && init?.method === "POST") {
      return new Response(JSON.stringify({ ok: true, id: "r1" }), { status: 200 });
    }
    return new Response(JSON.stringify({}), { status: 200 });
  }),
}));

describe("Dava Hatırlatıcı", () => {
  it("sayfa erişilebilirlik hatası üretmez", async () => {
    const { container } = render(
      <MemoryRouter>
        <Reminders />
      </MemoryRouter>
    );
    await screen.findByText("Henüz hatırlatıcı yok.");
    const results = await axe(container);
    expect(results.violations.length).toBe(0);
  });

  it("hatırlatıcı oluşturur", async () => {
    const { container } = render(
      <MemoryRouter>
        <Reminders />
      </MemoryRouter>
    );
    await screen.findByText("Henüz hatırlatıcı yok.");
    await userEvent.type(screen.getByLabelText("Başlık"), "Duruşma");
    await userEvent.type(screen.getByLabelText("Detay"), "Not");
    const dt = screen.getByLabelText("Tarih/Saat");
    expect(dt).toBeTruthy();
    await userEvent.type(dt, "2030-01-01T10:00");
    const btn = screen.getByRole("button", { name: /Hatırlatıcıyı Kaydet/ });
    expect(btn).toBeEnabled();
    await userEvent.click(btn);
  });
});
