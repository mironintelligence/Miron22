import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";
import LoadingScreen from "../components/LoadingScreen.jsx";

export default function PublicOnly() {
  const { status } = useAuth();
  if (status === "loading") {
    return <LoadingScreen variant="full" subtext="Oturum kontrol ediliyor" />;
  }  if (status === "authed") return <Navigate to="/dashboard" replace />;
  return <Outlet />;
}