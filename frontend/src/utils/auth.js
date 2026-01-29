// frontend/src/utils/auth.js

// Kullanıcı giriş yapmış mı kontrol et
export const isAuthenticated = () => {
  const token = localStorage.getItem("token");
  return !!token; // Token varsa true, yoksa false döner
};

// Kullanıcı verisini getir (Ad, Soyad, Rol vb.)
export const getUserData = () => {
  const userStr = localStorage.getItem("user");
  if (!userStr) return null;
  try {
    return JSON.parse(userStr);
  } catch (e) {
    return null;
  }
};

// Çıkış Yap
export const logout = () => {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  // İsteğe bağlı: Sayfayı yenile veya login'e yönlendir
  // window.location.href = "/login"; 
};

// Giriş Yap (Login sayfasında kullanılacak)
export const login = (token, user) => {
  localStorage.setItem("token", token);
  localStorage.setItem("user", JSON.stringify(user));
};

// Token'ı getir (API isteklerinde kullanmak için)
export const getToken = () => {
  return localStorage.getItem("token");
};