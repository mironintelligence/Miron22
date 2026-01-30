// frontend/src/utils/auth.js

// --- SABİTLER ---
const STORAGE_KEY = "mironUser";
const TOKEN_KEY = "token";

// --- TEMEL FONKSİYONLAR ---

// Kullanıcı giriş yapmış mı?
export const isAuthenticated = () => {
  const user = localStorage.getItem(STORAGE_KEY);
  const token = localStorage.getItem(TOKEN_KEY);
  return !!(user && token);
};

// Kullanıcı verisini getir
export const getUserData = () => {
  try {
    const userStr = localStorage.getItem(STORAGE_KEY);
    return userStr ? JSON.parse(userStr) : null;
  } catch (error) {
    return null;
  }
};

// Giriş Yap (Hem Token hem User kaydeder)
export const login = (token, user) => {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  if (user) localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
};

// Çıkış Yap
export const logout = () => {
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(TOKEN_KEY);
  window.location.href = "/login";
};

// Token Getir (API İstekleri İçin)
export const getToken = () => {
  return localStorage.getItem(TOKEN_KEY);
};

// --- UYUMLULUK (Hata veren yer burasıydı) ---
// Login.jsx 'setLibraUser' arıyor, onu bizim 'login' fonksiyonuna bağlıyoruz
export const setLibraUser = (userData) => {
  // Eğer user objesi içinde token varsa onu ayıralım
  const token = userData?.token || userData?.access_token || "dummy-token"; 
  login(token, userData);
};

// Diğer eski isimlendirmeler için takma adlar
export const getLibraUser = getUserData;
export const clearLibraUser = logout;