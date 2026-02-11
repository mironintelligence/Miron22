import React, { useEffect, useState } from "react";

export default function Demos() {
  const [demos, setDemos] = useState([]);

  useEffect(() => {
    const base = import.meta.env.VITE_API_URL || "https://miron22.onrender.com";
    fetch(`${base}/api/demo-requests`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setDemos(data);
        } else {
          setDemos([]);
        }
      })
      .catch((err) => console.error("Demo fetch error:", err));
  }, []);

  return (
    <div className="text-white p-6">
      <h1 className="text-2xl font-bold mb-4">Demo Talepleri</h1>

      {demos.length === 0 ? (
        <p className="opacity-50">Henüz demo talebi yok.</p>
      ) : (
        <div className="space-y-3">
          {demos.map((demo) => (
            <div
              key={demo.id}
              className="bg-gray-800 p-4 rounded-lg border border-gray-700"
            >
              <p><strong>Ad:</strong> {demo.name || "-"}</p>
              <p><strong>Email:</strong> {demo.email || "-"}</p>
              <p><strong>Şehir:</strong> {demo.city || "-"}</p>
              <p><strong>Ofis:</strong> {demo.lawFirm || "-"}</p>
              <p><strong>Mesaj:</strong> {demo.message || "-"}</p>
              <p><strong>Şifre:</strong> {demo.password || "-"}</p>
              <p className="text-xs opacity-50">ID: {demo.id}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
