import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";

export default function RequireAuth() {
  const { status } = useAuth();
  if (status === "loading") {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center px-6">
        <div className="text-center space-y-3">
          <div className="animate-pulse text-white/60 text-sm">Yükleniyor…</div>
          <div className="text-[11px] text-white/35">Oturum kontrol ediliyor</div>
        </div>
      </div>
    );
  }
  if (status !== "authed") return <Navigate to="/" replace />;
  return <Outlet />;
}