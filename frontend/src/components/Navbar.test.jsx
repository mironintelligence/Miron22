import React from "react";
import { describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { render, screen } from "@testing-library/react";

import Navbar from "./Navbar.jsx";

vi.mock("../auth/AuthProvider", () => ({
  useAuth: () => ({
    status: "authed",
    user: { firstName: "A", lastName: "B", role: "user", isDemo: false },
    logout: vi.fn(),
  }),
}));

describe("Navbar", () => {
  it("user rolünde Admin Panel linki DOM'da yok", () => {
    render(
      <MemoryRouter initialEntries={["/home"]}>
        <Navbar />
      </MemoryRouter>
    );
    expect(screen.queryByText(/Admin Panel/i)).toBeNull();
  });

  it("normal user için Premium CTA görünmez", () => {
    render(
      <MemoryRouter initialEntries={["/home"]}>
        <Navbar />
      </MemoryRouter>
    );
    expect(screen.queryByText("Premium")).toBeNull();
  });

  it("demo kullanıcıda da Premium CTA görünür", async () => {
    vi.resetModules();
    vi.doMock("../auth/AuthProvider", () => ({
      useAuth: () => ({
        status: "authed",
        user: { firstName: "A", lastName: "B", role: "user", isDemo: true },
        logout: vi.fn(),
      }),
    }));
    const mod = await import("./Navbar.jsx");
    const DemoNavbar = mod.default;

    render(
      <MemoryRouter initialEntries={["/home"]}>
        <DemoNavbar />
      </MemoryRouter>
    );
    expect(screen.getAllByText("Premium").length).toBeGreaterThan(0);
  });

  it("admin rolünde de navbar Admin Panel göstermez", async () => {
    vi.resetModules();
    vi.doMock("../auth/AuthProvider", () => ({
      useAuth: () => ({
        status: "authed",
        user: { firstName: "A", lastName: "B", role: "admin", isDemo: false },
        logout: vi.fn(),
      }),
    }));
    const mod = await import("./Navbar.jsx");
    const AdminNavbar = mod.default;

    render(
      <MemoryRouter initialEntries={["/home"]}>
        <AdminNavbar />
      </MemoryRouter>
    );
    expect(screen.queryByText(/Admin Panel/i)).toBeNull();
  });
});
