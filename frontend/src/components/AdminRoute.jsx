import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";
import LoadingScreen from "./LoadingScreen.jsx";

export default function AdminRoute({ children }) {
  const { status, user } = useAuth();
  if (status === "loading") {
    return <LoadingScreen variant="full" subtext="Oturum kontrol ediliyor" />;
  }
  if (status !== "authed") return <Navigate to="/" replace />;
  return user?.role === "admin" ? children : <Navigate to="/unauthorized" replace />;
}
