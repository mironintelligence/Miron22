import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

const mockUseAuth = vi.fn();
vi.mock("../auth/AuthProvider", () => ({
  useAuth: () => mockUseAuth(),
}));

import GuestRoute from "./GuestRoute.jsx";

function renderRoutes(initial = "/login") {
  return render(
    <MemoryRouter initialEntries={[initial]}>
      <Routes>
        <Route path="/dashboard" element={<div>dash</div>} />
        <Route
          path="/login"
          element={
            <GuestRoute>
              <div>guest-login</div>
            </GuestRoute>
          }
        />
      </Routes>
    </MemoryRouter>
  );
}

describe("GuestRoute", () => {
  beforeEach(() => mockUseAuth.mockReset());
  afterEach(() => mockUseAuth.mockReset());

  it("yükleme halinde guest variantlı LoadingScreen gösterir", () => {
    mockUseAuth.mockReturnValue({ status: "loading" });
    const { container } = renderRoutes();
    expect(container.firstChild.className).toContain("min-h-[calc(100vh-10rem)]");
  });

  it("authed kullanıcı /dashboard'a yönlendirilir", () => {
    mockUseAuth.mockReturnValue({ status: "authed" });
    renderRoutes();
    expect(screen.getByText("dash")).toBeInTheDocument();
    expect(screen.queryByText("guest-login")).toBeNull();
  });

  it("anon kullanıcı child görür", () => {
    mockUseAuth.mockReturnValue({ status: "anon" });
    renderRoutes();
    expect(screen.getByText("guest-login")).toBeInTheDocument();
  });
});
