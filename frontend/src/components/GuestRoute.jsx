import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";
import LoadingScreen from "./LoadingScreen.jsx";

export default function GuestRoute({ children }) {
  const { status } = useAuth();
  if (status === "loading") {
    return <LoadingScreen variant="guest" />;
  }
  return status === "authed" ? <Navigate to="/dashboard" replace /> : children;
}
