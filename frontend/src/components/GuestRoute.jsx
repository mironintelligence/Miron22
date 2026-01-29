import React from "react";
import { Navigate } from "react-router-dom";
import { isAuthenticated } from "../utils/auth";

export default function GuestRoute({ children }) {
  return isAuthenticated() ? <Navigate to="/home" replace /> : children;
}