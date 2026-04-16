import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";

export default function AdminRoute({ children }) {
  const { status, user } = useAuth();
  if (status === "loading") {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="animate-pulse text-white/50 text-sm">Yükleniyor…</div>
      </div>
    );
  }
  if (status !== "authed") return <Navigate to="/" replace />;
  return user?.role === "admin" ? children : <Navigate to="/unauthorized" replace />;
}
