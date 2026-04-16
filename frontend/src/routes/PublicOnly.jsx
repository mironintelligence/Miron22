import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";

export default function PublicOnly() {
  const { status } = useAuth();
  if (status === "loading") {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="animate-pulse text-white/50 text-sm">Yükleniyor…</div>
      </div>
    );
  }
  if (status === "authed") return <Navigate to="/dashboard" replace />;
  return <Outlet />;
}