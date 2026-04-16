import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";

export default function GuestRoute({ children }) {
  const { status } = useAuth();
  if (status === "loading") {
    return (
      <div className="min-h-[calc(100vh-10rem)] bg-black text-white flex items-center justify-center px-6">
        <div className="text-center space-y-3">
          <div className="animate-pulse text-white/60 text-sm">Yükleniyor…</div>
          <div className="text-[11px] text-white/35">Oturum kontrol ediliyor</div>
        </div>
      </div>
    );
  }
  return status === "authed" ? <Navigate to="/dashboard" replace /> : children;
}
