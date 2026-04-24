import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

const mockUseAuth = vi.fn();
vi.mock("../auth/AuthProvider", () => ({
  useAuth: () => mockUseAuth(),
}));

import AdminRoute from "./AdminRoute.jsx";

function renderRoutes(initial = "/admin") {
  return render(
    <MemoryRouter initialEntries={[initial]}>
      <Routes>
        <Route path="/" element={<div>landing</div>} />
        <Route path="/unauthorized" element={<div>403</div>} />
        <Route
          path="/admin"
          element={
            <AdminRoute>
              <div>admin-panel</div>
            </AdminRoute>
          }
        />
      </Routes>
    </MemoryRouter>
  );
}

describe("AdminRoute", () => {
  beforeEach(() => mockUseAuth.mockReset());
  afterEach(() => mockUseAuth.mockReset());

  it("yükleme durumunda LoadingScreen gösterir", () => {
    mockUseAuth.mockReturnValue({ status: "loading" });
    renderRoutes();
    expect(screen.getByText("Yükleniyor…")).toBeInTheDocument();
  });

  it("anonim kullanıcı landing'e yönlendirilir", () => {
    mockUseAuth.mockReturnValue({ status: "anon", user: null });
    renderRoutes();
    expect(screen.getByText("landing")).toBeInTheDocument();
    expect(screen.queryByText("admin-panel")).toBeNull();
  });

  it("giriş yapmış ama admin olmayan kullanıcı /unauthorized'a yönlendirilir", () => {
    mockUseAuth.mockReturnValue({ status: "authed", user: { role: "user" } });
    renderRoutes();
    expect(screen.getByText("403")).toBeInTheDocument();
    expect(screen.queryByText("admin-panel")).toBeNull();
  });

  it("admin rolü panel içeriğini görür", () => {
    mockUseAuth.mockReturnValue({ status: "authed", user: { role: "admin" } });
    renderRoutes();
    expect(screen.getByText("admin-panel")).toBeInTheDocument();
  });
});
