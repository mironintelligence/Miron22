import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

const mockUseAuth = vi.fn();
vi.mock("../auth/AuthProvider", () => ({
  useAuth: () => mockUseAuth(),
}));

import ProtectedRoute from "./ProtectedRoute.jsx";

function renderWithRoutes(initial = "/protected") {
  return render(
    <MemoryRouter initialEntries={[initial]}>
      <Routes>
        <Route path="/" element={<div>landing</div>} />
        <Route
          path="/protected"
          element={
            <ProtectedRoute>
              <div>secret</div>
            </ProtectedRoute>
          }
        />
      </Routes>
    </MemoryRouter>
  );
}

describe("ProtectedRoute", () => {
  beforeEach(() => mockUseAuth.mockReset());
  afterEach(() => mockUseAuth.mockReset());

  it("status=loading iken LoadingScreen gösterir, child render etmez", () => {
    mockUseAuth.mockReturnValue({ status: "loading" });
    renderWithRoutes();
    expect(screen.getByText("Yükleniyor…")).toBeInTheDocument();
    expect(screen.queryByText("secret")).toBeNull();
  });

  it("anonim kullanıcıyı landing'e yönlendirir", () => {
    mockUseAuth.mockReturnValue({ status: "anon" });
    renderWithRoutes();
    expect(screen.getByText("landing")).toBeInTheDocument();
    expect(screen.queryByText("secret")).toBeNull();
  });

  it("status=authed iken child render eder", () => {
    mockUseAuth.mockReturnValue({ status: "authed", user: { role: "user" } });
    renderWithRoutes();
    expect(screen.getByText("secret")).toBeInTheDocument();
  });
});
