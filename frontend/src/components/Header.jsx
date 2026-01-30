import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { User, LogOut, X, ChevronRight } from "lucide-react"; // İkonlar
import { isAuthenticated, logout, getUserData, registerUserLocal, loginUserLocal } from "../utils/auth";

const Header = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState("login"); // 'login' veya 'register'
  const [user, setUser] = useState(null);
  
  // Form State
  const [formData, setFormData] = useState({ name: "", surname: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const navigate = useNavigate();
  const isAuth = isAuthenticated();

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    if(isAuth) setUser(getUserData());
    return () => window.removeEventListener("scroll", handleScroll);
  }, [isAuth]);

  // Form İşlemleri
  const handleAuth = (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (modalMode === "register") {
      // KAYIT OL
      if (!formData.name || !formData.surname || !formData.email || !formData.password) {
        setError("Lütfen tüm alanları doldurun.");
        return;
      }
      const res = registerUserLocal(formData);
      if (res.success) {
        setSuccess("Kayıt başarılı! Şimdi giriş yapabilirsiniz.");
        setTimeout(() => setModalMode("login"), 1500);
      } else {
        setError(res.message);
      }
    } else {
      // GİRİŞ YAP
      const res = loginUserLocal(formData.email, formData.password);
      if (res.success) {
        setUser(res.user);
        setShowModal(false);
        navigate("/dashboard");
      } else {
        setError(res.message);
      }
    }
  };

  return (
    <>
      {/* --- HEADER BAR (SİYAH & ALTIN) --- */}
      <header
        className={`fixed top-0 left-0 right-0 z-40 transition-all duration-500 border-b ${
          isScrolled
            ? "bg-black/90 backdrop-blur-xl border-amber-500/30 py-4"
            : "bg-transparent border-transparent py-6"
        }`}
      >
        <div className="container mx-auto px-6 flex items-center justify-between">
          
          {/* MARKA İSMİ (Logo Yok, Sadece Yazı) */}
          <Link to="/" className="group">
            <span className="font-['Outfit'] font-bold text-2xl tracking-[0.2em] text-white group-hover:text-amber-500 transition-colors">
              MIRON
            </span>
          </Link>

          {/* SAĞ TARAF */}
          <div>
            {isAuth ? (
              <div className="flex items-center gap-4">
                <span className="text-amber-500 font-medium font-['Outfit'] hidden md:block">
                  {user?.name} {user?.surname}
                </span>
                <button
                  onClick={logout}
                  className="px-4 py-2 border border-amber-500/30 text-amber-500 rounded hover:bg-amber-500 hover:text-black transition-all"
                >
                  Çıkış
                </button>
              </div>
            ) : (
              <button
                onClick={() => { setShowModal(true); setModalMode("login"); setError(""); }}
                className="px-8 py-2.5 bg-transparent border border-amber-500 text-amber-500 font-bold tracking-wider rounded-none hover:bg-amber-500 hover:text-black transition-all duration-300 shadow-[0_0_15px_-5px_rgba(245,158,11,0.5)]"
              >
                GİRİŞ YAP
              </button>
            )}
          </div>
        </div>
      </header>

      {/* --- POPUP MODAL (SİYAH & ALTIN) --- */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="relative w-full max-w-md bg-black border border-amber-500/40 p-8 shadow-[0_0_50px_-15px_rgba(245,158,11,0.3)]">
            
            {/* Kapat Butonu */}
            <button 
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 text-gray-500 hover:text-amber-500 transition-colors"
            >
              <X size={24} />
            </button>

            <h2 className="text-3xl font-bold text-white mb-2 font-['Outfit'] tracking-wide">
              {modalMode === 'login' ? 'GİRİŞ' : 'KAYIT OL'}
            </h2>
            <p className="text-gray-400 text-sm mb-8">Miron dünyasına erişim sağlayın.</p>

            <form onSubmit={handleAuth} className="space-y-5">
              
              {modalMode === 'register' && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs text-amber-500/80 uppercase tracking-wider">AD</label>
                    <input 
                      type="text" 
                      className="w-full bg-gray-900 border-b border-gray-700 text-white p-2 focus:border-amber-500 focus:outline-none transition-colors"
                      value={formData.name}
                      onChange={e => setFormData({...formData, name: e.target.value})}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-amber-500/80 uppercase tracking-wider">SOYAD</label>
                    <input 
                      type="text" 
                      className="w-full bg-gray-900 border-b border-gray-700 text-white p-2 focus:border-amber-500 focus:outline-none transition-colors"
                      value={formData.surname}
                      onChange={e => setFormData({...formData, surname: e.target.value})}
                    />
                  </div>
                </div>
              )}

              <div className="space-y-1">
                <label className="text-xs text-amber-500/80 uppercase tracking-wider">E-POSTA</label>
                <input 
                  type="email" 
                  className="w-full bg-gray-900 border-b border-gray-700 text-white p-2 focus:border-amber-500 focus:outline-none transition-colors"
                  value={formData.email}
                  onChange={e => setFormData({...formData, email: e.target.value})}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs text-amber-500/80 uppercase tracking-wider">ŞİFRE</label>
                <input 
                  type="password" 
                  className="w-full bg-gray-900 border-b border-gray-700 text-white p-2 focus:border-amber-500 focus:outline-none transition-colors"
                  value={formData.password}
                  onChange={e => setFormData({...formData, password: e.target.value})}
                />
              </div>

              {error && <p className="text-red-500 text-sm">{error}</p>}
              {success && <p className="text-green-500 text-sm">{success}</p>}

              <button 
                type="submit"
                className="w-full bg-amber-600 text-black font-bold py-3 hover:bg-amber-500 transition-colors tracking-widest mt-4"
              >
                {modalMode === 'login' ? 'GİRİŞ YAP' : 'HESAP OLUŞTUR'}
              </button>
            </form>

            <div className="mt-6 text-center">
              <button 
                onClick={() => { setModalMode(modalMode === 'login' ? 'register' : 'login'); setError(""); }}
                className="text-gray-500 text-sm hover:text-white transition-colors border-b border-gray-800 pb-0.5"
              >
                {modalMode === 'login' ? 'Hesabınız yok mu? Kayıt Olun' : 'Zaten hesabınız var mı? Giriş Yapın'}
              </button>
            </div>

          </div>
        </div>
      )}
    </>
  );
};

export default Header;