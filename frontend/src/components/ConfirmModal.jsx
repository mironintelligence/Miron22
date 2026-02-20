import React from "react";

export default function ConfirmModal({
  open,
  title = "Emin misiniz?",
  message = "Bu işlem geri alınamaz.",
  confirmText = "Evet, devam et",
  cancelText = "Vazgeç",
  danger = true,
  onConfirm,
  onCancel,
}) {
  if (!open) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.55)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        padding: 16,
      }}
      onMouseDown={onCancel}
    >
      <div
        className="card"
        style={{ width: "100%", maxWidth: 520, padding: 20 }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 8 }}>{title}</div>
        <div className="text-subtle" style={{ marginBottom: 18 }}>{message}</div>

        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", flexWrap: "wrap" }}>
          <button className="btn-secondary" onClick={onCancel}>{cancelText}</button>
          <button className={danger ? "btn-danger" : "btn-primary"} onClick={onConfirm}>
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
