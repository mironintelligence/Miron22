import React from "react";

export default function ListCard({ title, subtitle, right, children }) {
  return (
    <div className="card" style={{ padding: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
        <div>
          <div style={{ fontWeight: 900, fontSize: 14 }}>{title}</div>
          {subtitle ? <div className="muted" style={{ marginTop: 2 }}>{subtitle}</div> : null}
        </div>
        {right ? <div>{right}</div> : null}
      </div>
      {children ? <div style={{ marginTop: 10 }}>{children}</div> : null}
    </div>
  );
}
