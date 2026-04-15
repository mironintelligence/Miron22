/**
 * Erişim jetonu localStorage'da TUTULMAZ (XSS riski).
 * İsteğe bağlı: yalnızca UI tercihleri (sessionStorage, hassas değil).
 */
const PREF_KEY = "miron_ui_prefs";

export function getUiPrefs() {
  try {
    return JSON.parse(sessionStorage.getItem(PREF_KEY) || "{}");
  } catch {
    return {};
  }
}

export function setUiPrefs(prefs) {
  try {
    sessionStorage.setItem(PREF_KEY, JSON.stringify({ ...getUiPrefs(), ...prefs }));
  } catch {
    /* ignore */
  }
}

/** Eski sürümlerden kalma anahtarları temizle */
export function purgeLegacyTokenStorage() {
  const keys = [
    "miron_token",
    "miron_user",
    "token",
    "user",
    "miron_current_user",
    "libraUser",
    "authUser",
    "miron_admin_token",
    "adminToken",
  ];
  keys.forEach((k) => {
    try {
      localStorage.removeItem(k);
    } catch {
      /* ignore */
    }
  });
  try {
    sessionStorage.removeItem("miron_admin_authenticated");
  } catch {
    /* ignore */
  }
}
