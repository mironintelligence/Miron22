import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";
import LoadingScreen from "./LoadingScreen.jsx";

/**
 * Sadece admin kullanıcıların /admin/metrics (eski raporlama paneli) sayfasına girmesine izin verir.
 */
export default function DashboardGate({ children }) {
  const { status, user } = useAuth();
  if (status === "loading") {
    return <LoadingScreen variant="full" subtext="Oturum kontrol ediliyor" />;
  }
  if (status !== "authed") {
    return <Navigate to="/" replace />;
  }
  if ((user?.role || "").toLowerCase() !== "admin") {
    return <Navigate to="/dashboard" replace />;
  }
  return children;
}
