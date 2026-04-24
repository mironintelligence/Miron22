import React from "react";
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import LoadingScreen from "./LoadingScreen.jsx";

describe("LoadingScreen", () => {
  it("varsayılan mesaj ve alt metin gösterir", () => {
    render(<LoadingScreen />);
    expect(screen.getByText("Yükleniyor…")).toBeInTheDocument();
    expect(screen.getByText("Oturum kontrol ediliyor")).toBeInTheDocument();
  });

  it("guest variantında kısa yükseklik class'ı uygular", () => {
    const { container } = render(<LoadingScreen variant="guest" />);
    expect(container.firstChild.className).toContain("min-h-[calc(100vh-10rem)]");
  });

  it("full variantında tam ekran yüksekliği class'ı uygular", () => {
    const { container } = render(<LoadingScreen variant="full" />);
    expect(container.firstChild.className).toContain("min-h-screen");
  });

  it("bilinmeyen variant verilirse full fallback'e düşer", () => {
    const { container } = render(<LoadingScreen variant="unknown" />);
    expect(container.firstChild.className).toContain("min-h-screen");
  });

  it("subtext boş string verilirse alt metin render edilmez", () => {
    render(<LoadingScreen subtext="" />);
    expect(screen.queryByText("Oturum kontrol ediliyor")).toBeNull();
  });

  it("özel mesaj render edilir", () => {
    render(<LoadingScreen message="Hazırlanıyor" subtext="Bir saniye" />);
    expect(screen.getByText("Hazırlanıyor")).toBeInTheDocument();
    expect(screen.getByText("Bir saniye")).toBeInTheDocument();
  });
});
