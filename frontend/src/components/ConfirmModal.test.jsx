import React from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import ConfirmModal from "./ConfirmModal.jsx";

describe("ConfirmModal", () => {
  it("open false iken hiçbir şey render etmez", () => {
    const { container } = render(<ConfirmModal open={false} />);
    expect(container.firstChild).toBeNull();
  });

  it("varsayılan başlık ve mesajı gösterir", () => {
    render(<ConfirmModal open onConfirm={() => {}} onCancel={() => {}} />);
    expect(screen.getByText("Emin misiniz?")).toBeInTheDocument();
    expect(screen.getByText("Bu işlem geri alınamaz.")).toBeInTheDocument();
  });

  it("onay butonuna basınca onConfirm çağırır", async () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    render(<ConfirmModal open onConfirm={onConfirm} onCancel={onCancel} />);
    await userEvent.click(screen.getByRole("button", { name: /Evet, devam et/ }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onCancel).not.toHaveBeenCalled();
  });

  it("vazgeç butonuna basınca onCancel çağırır", async () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    render(<ConfirmModal open onConfirm={onConfirm} onCancel={onCancel} />);
    await userEvent.click(screen.getByRole("button", { name: /Vazgeç/ }));
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("overlay tıklanınca onCancel tetiklenir (dış tık kapatma)", () => {
    const onCancel = vi.fn();
    const { container } = render(
      <ConfirmModal open onConfirm={() => {}} onCancel={onCancel} />
    );
    // Overlay = kökteki fixed konumdaki div.
    const overlay = container.firstChild;
    fireEvent.mouseDown(overlay);
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("danger=false iken yıkıcı değil, primary buton stili kullanılır", () => {
    render(
      <ConfirmModal open danger={false} onConfirm={() => {}} onCancel={() => {}} />
    );
    const btn = screen.getByRole("button", { name: /Evet, devam et/ });
    expect(btn).toHaveClass("btn-primary");
    expect(btn).not.toHaveClass("btn-danger");
  });

  it("özel buton etiketleri doğru render edilir", () => {
    render(
      <ConfirmModal
        open
        confirmText="Sil"
        cancelText="İptal"
        title="Kullanıcıyı sil"
        message="Geri alınamaz."
        onConfirm={() => {}}
        onCancel={() => {}}
      />
    );
    expect(screen.getByText("Kullanıcıyı sil")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sil" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "İptal" })).toBeInTheDocument();
  });
});
