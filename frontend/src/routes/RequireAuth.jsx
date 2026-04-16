import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";
import LoadingScreen from "../components/LoadingScreen.jsx";

export default function RequireAuth() {
  const { status } = useAuth();
  if (status === "loading") {
    return <LoadingScreen variant="full" />;
  }
  if (status !== "authed") return <Navigate to="/" replace />;
  return <Outlet />;
}