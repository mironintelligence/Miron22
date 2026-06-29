import React from "react";
import { describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { render, screen } from "@testing-library/react";

import Home from "./Home.jsx";

vi.mock("../auth/AuthProvider", () => ({
  useAuth: () => ({ user: { role: "user" } }),
}));

describe("Ana menü", () => {
  it("ana modül kutucuklarını gösterir", () => {
    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>
    );
    expect(screen.getByText("Evrak Analizi")).toBeInTheDocument();
    expect(screen.getByText("Sözleşme Analizi")).toBeInTheDocument();
    expect(screen.getByText("Sözleşme Oluşturucu")).toBeInTheDocument();
    expect(screen.getByText("Hatırlatıcı & Takvim")).toBeInTheDocument();
  });
});
