// frontend/src/utils/auth.js
const STORAGE_KEY = "mironUser";
const TOKEN_KEY = "token";

export const isAuthenticated = () => {
  const user = localStorage.getItem(STORAGE_KEY);
  const token = localStorage.getItem(TOKEN_KEY);
  return !!(user && token);
};

export const getUserData = () => {
  try {
    const userStr = localStorage.getItem(STORAGE_KEY);
    return userStr ? JSON.parse(userStr) : null;
  } catch (error) {
    return null;
  }
};

export const login = (token, user) => {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  if (user) localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
};

export const logout = () => {
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(TOKEN_KEY);
  window.location.href = "/login";
};

export const getToken = () => localStorage.getItem(TOKEN_KEY);

// ESKİ KODLAR İÇİN UYUMLULUK (Hata buradaydı)
export const setLibraUser = (userData) => {
  const token = userData?.token || userData?.access_token || "dummy-token"; 
  login(token, userData);
};

export const getLibraUser = getUserData;
export const clearLibraUser = logout;