// frontend/src/utils/auth.js

const USERS_DB_KEY = "miron_users_json"; // Kullanıcıları burada JSON olarak tutacağız
const CURR_USER_KEY = "miron_current_user";

// --- SAHTE JSON VERİTABANI İŞLEMLERİ ---

// Yeni Kullanıcı Kaydet (JSON'a ekle)
export const registerUserLocal = (userData) => {
  const users = JSON.parse(localStorage.getItem(USERS_DB_KEY) || "[]");
  
  // Email kontrolü
  const exists = users.find(u => u.email === userData.email);
  if (exists) return { success: false, message: "Bu e-posta zaten kayıtlı." };

  users.push(userData);
  localStorage.setItem(USERS_DB_KEY, JSON.stringify(users));
  return { success: true };
};

// Kullanıcı Girişi (JSON'dan kontrol et)
export const loginUserLocal = (email, password) => {
  const users = JSON.parse(localStorage.getItem(USERS_DB_KEY) || "[]");
  const user = users.find(u => u.email === email && u.password === password);
  
  if (user) {
    const { password, ...safeUser } = user; // Şifreyi session'a kaydetme
    localStorage.setItem(CURR_USER_KEY, JSON.stringify(safeUser));
    return { success: true, user: safeUser };
  }
  return { success: false, message: "Hatalı e-posta veya şifre." };
};

// --- OTURUM YÖNETİMİ ---

export const isAuthenticated = () => {
  return !!localStorage.getItem(CURR_USER_KEY);
};

export const getUserData = () => {
  try {
    return JSON.parse(localStorage.getItem(CURR_USER_KEY));
  } catch {
    return null;
  }
};

export const logout = () => {
  localStorage.removeItem(CURR_USER_KEY);
  window.location.reload();
};

// ESKİ KODLARIN ÇALIŞMASI İÇİN (Hata buradaydı, düzelttik)
export const setLibraUser = (user) => {
  localStorage.setItem(CURR_USER_KEY, JSON.stringify(user));
};