import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";

export default function ProtectedRoute({ children }) {
  const { status, user } = useAuth();
  const location = useLocation();

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

  const perms = user?.permissions || [];
  const needsPayment =
    perms.includes("gate.payment_card") && !user?.paymentCardOnFile && user?.role !== "admin" && user?.role !== "demo";

  if (needsPayment && location.pathname !== "/complete-payment") {
    return <Navigate to="/complete-payment" replace />;
  }

  return children;
}
