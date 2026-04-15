import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";

/**
 * Sadece admin kullanıcıların /admin/metrics (eski raporlama paneli) sayfasına girmesine izin verir.
 */
export default function DashboardGate({ children }) {
  const { status, user } = useAuth();
  if (status === "loading") {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="animate-pulse text-white/50 text-sm">Yükleniyor…</div>
      </div>
    );
  }
  if (status !== "authed") {
    return <Navigate to="/" replace />;
  }
  if ((user?.role || "").toLowerCase() !== "admin") {
    return <Navigate to="/dashboard" replace />;
  }
  return children;
}
