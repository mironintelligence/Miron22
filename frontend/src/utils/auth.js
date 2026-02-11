const TOKEN_KEY = "miron_token";
const USER_KEY = "miron_user";
const LEGACY_CURRENT = "miron_current_user";
const LEGACY_LIBRA = "libraUser";
const LEGACY_AUTH = "authUser";

export const getStoredAuth = () => {
  let token = localStorage.getItem(TOKEN_KEY);
  let user = null;
  try {
    user = JSON.parse(localStorage.getItem(USER_KEY) || "null");
  } catch {
    user = null;
  }
  if (!token) token = localStorage.getItem("token") || null;
  if (!user) {
    try {
      user = JSON.parse(localStorage.getItem(LEGACY_CURRENT) || "null");
    } catch {
      user = null;
    }
  }
  return { token, user };
};

export const setStoredAuth = (token, user) => {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  if (user) {
    const raw = JSON.stringify(user);
    localStorage.setItem(USER_KEY, raw);
    localStorage.setItem(LEGACY_CURRENT, raw);
    localStorage.setItem(LEGACY_LIBRA, raw);
    localStorage.setItem(LEGACY_AUTH, raw);
  }
};

export const clearStoredAuth = () => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  localStorage.removeItem(LEGACY_CURRENT);
  localStorage.removeItem(LEGACY_LIBRA);
  localStorage.removeItem(LEGACY_AUTH);
};

export const isAuthenticated = () => {
  return !!localStorage.getItem(TOKEN_KEY);
};

export const getUserData = () => {
  try {
    return JSON.parse(localStorage.getItem(USER_KEY) || "null");
  } catch {
    return null;
  }
};
