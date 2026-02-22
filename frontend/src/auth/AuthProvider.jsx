import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { login as apiLogin, register as apiRegister, refresh as apiRefresh, logout as apiLogout } from "./api";
import { clearStoredAuth, getStoredAuth, setStoredAuth } from "../utils/auth";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [status, setStatus] = useState("loading");
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [lastLoginMeta, setLastLoginMeta] = useState(null);

  useEffect(() => {
    const stored = getStoredAuth();
    if (stored?.token) {
      setToken(stored.token);
      setUser(stored.user || null);
      setStatus("authed");
      return;
    }
    apiRefresh()
      .then((data) => {
        const newToken = data?.access_token || "";
        if (newToken) {
          setStoredAuth(newToken, stored?.user || null);
          setToken(newToken);
          setStatus("authed");
        } else {
          setStatus("guest");
        }
      })
      .catch(() => setStatus("guest"));
  }, []);

  const login = async (email, password) => {
    const data = await apiLogin(email, password);
    const meta = data?.user || {};
    const normalized = {
      id: meta?.id || meta?.user_id || null,
      email: meta?.email || email,
      firstName: meta?.first_name || meta?.firstName || meta?.user_metadata?.first_name || "",
      lastName: meta?.last_name || meta?.lastName || meta?.user_metadata?.last_name || "",
    };

    const accessToken = data?.access_token || "";
    setStoredAuth(accessToken, normalized);
    setToken(accessToken);
    setUser(normalized);
    setStatus("authed");
    setLastLoginMeta({
      at: Date.now(),
      name:
        `${normalized.firstName || ""} ${normalized.lastName || ""}`.trim() ||
        normalized.email ||
        email,
    });
    return normalized;
  };

  const register = async ({ email, password, firstName, lastName, mode }) => {
    return apiRegister({ email, password, firstName, lastName, mode });
  };

  const logout = async () => {
    try {
      await apiLogout();
    } catch {
      null;
    }
    clearStoredAuth();
    setToken(null);
    setUser(null);
    setStatus("guest");
    setLastLoginMeta(null);
  };

  const consumeLastLoginMeta = () => {
    if (!lastLoginMeta) return null;
    const meta = lastLoginMeta;
    setLastLoginMeta(null);
    return meta;
  };

  const value = useMemo(
    () => ({ status, user, token, login, logout, register, lastLoginMeta, consumeLastLoginMeta }),
    [status, user, token, lastLoginMeta]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
