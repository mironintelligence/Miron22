// src/pages/Reports.jsx
import React, { useEffect, useState } from "react";

const API_BASE = "http://127.0.0.1:8000";

export default function Reports() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const load = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/reports/overview`);
      if (!res.ok) throw new Error("Hata");
      const json = await res.json();
      setData(json);
    } catch (err) {
      console.error(err);
      setError("Raporlar yüklenirken hata oluştu.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <div style={{ padding: "20px" }}>
      <h1>Raporlar (Özet)</h1>
      {error && <div style={{ color: "red", marginBottom: "10px" }}>{error}</div>}

      {loading && <p>Yükleniyor...</p>}

      {data && (
        <>
          <div
            style={{
              display: "flex",
              gap: "20px",
              marginBottom: "20px",
            }}
          >
            <div
              style={{
                border: "1px solid #ddd",
                padding: "15px",
                borderRadius: "6px",
                flex: 1,
              }}
            >
              <h3>Toplam Dosya</h3>
              <p style={{ fontSize: "24px", fontWeight: "bold" }}>
                {data.total_cases}
              </p>
            </div>
            <div
              style={{
                border: "1px solid #ddd",
                padding: "15px",
                borderRadius: "6px",
                flex: 1,
              }}
            >
              <h3>Toplam Tahsilat</h3>
              <p style={{ fontSize: "24px", fontWeight: "bold" }}>
                ₺ {data.total_collected.toFixed(2)}
              </p>
            </div>
          </div>

          <div
            style={{
              border: "1px solid #ddd",
              padding: "15px",
              borderRadius: "6px",
              marginBottom: "20px",
            }}
          >
            <h3>Türlere Göre Dosya Sayısı</h3>
            <ul>
              <li>İcra: {data.by_type.icra}</li>
              <li>Dava: {data.by_type.dava}</li>
              <li>Danışmanlık: {data.by_type.danismanlik}</li>
            </ul>
          </div>
        </>
      )}
    </div>
  );
}
