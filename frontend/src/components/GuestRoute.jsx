import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";

export default function GuestRoute({ children }) {
  const { status } = useAuth();
  if (status === "loading") return null;
  return status === "authed" ? <Navigate to="/home" replace /> : children;
}
