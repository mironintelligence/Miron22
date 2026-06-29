import React from "react";
import { describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { fireEvent, render, screen } from "@testing-library/react";
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
    await screen.findByText("Bu gün için hatırlatıcı yok.");
    const results = await axe(container, {
      rules: { "color-contrast": { enabled: false } },
    });
    expect(results.violations.length).toBe(0);
  });

  it("hatırlatıcı oluşturur", async () => {
    const { container } = render(
      <MemoryRouter>
        <Reminders />
      </MemoryRouter>
    );
    await screen.findByText("Bu gün için hatırlatıcı yok.");
    await userEvent.click(screen.getByRole("button", { name: /Yeni Hatırlatıcı Ekle/ }));
    await userEvent.type(screen.getByPlaceholderText("Başlık *"), "Duruşma");
    await userEvent.type(screen.getByPlaceholderText("Not / detay"), "Not");
    const dt = container.querySelector('input[type="datetime-local"]');
    expect(dt).toBeTruthy();
    fireEvent.change(dt, { target: { value: "2030-01-01T10:00" } });
    const btn = screen.getByRole("button", { name: /Kaydet/ });
    expect(btn).toBeEnabled();
    await userEvent.click(btn);
  });
});
