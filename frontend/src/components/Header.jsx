import React, { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Menu, X, ArrowRight, User, LogOut, ChevronRight, Lock } from "lucide-react";
import { isAuthenticated, logout, getUserData } from "../utils/auth";

const Header = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [user, setUser] = useState(null);
  
  const navigate = useNavigate();
  const isAuth = isAuthenticated();

  // Scroll Takibi
  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    
    if(isAuth) {
      setUser(getUserData());
    }
    
    return () => window.removeEventListener("scroll", handleScroll);
  }, [isAuth]);

  // Çıkış Yap
  const handleLogout = () => {
    logout();
    navigate("/login");
    window.location.reload();
  };

  return (
    <>
      <header
        className={`fixed top-0 w-full z-50 transition-all duration-300 border-b ${
          isScrolled
            ? "bg-white/80 backdrop-blur-xl border-gray-200 py-3 shadow-sm"
            : "bg-white/0 border-transparent py-5"
        }`}
      >
        <div className="container mx-auto px-6">
          <div className="flex items-center justify-between">
            
            {/* SOL: Hamburger Menü & Logo */}
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setIsMenuOpen(true)}
                className="p-2 -ml-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors lg:hidden"
              >
                <Menu size={24} />
              </button>

              <Link to={isAuth ? "/dashboard" : "/"} className="flex flex-col group select-none">
                <div className="flex items-center gap-1">
                    <span className="font-['Outfit'] font-bold text-2xl tracking-tight text-slate-900 leading-none">
                    Miron<span className="text-blue-600">AI</span>
                    </span>
                </div>
                <span className="font-['Outfit'] text-[10px] font-medium text-slate-400 tracking-[0.2em] uppercase mt-0.5 group-hover:text-blue-500 transition-colors">
                  by Miron Intelligence
                </span>
              </Link>
            </div>

            {/* ORTA: Desktop Menü (Sadece Çıkış Yapılmamışsa Görünür) */}
            {!isAuth && (
              <nav className="hidden lg:flex items-center gap-8">
                {['Özellikler', 'Çözümler', 'Fiyatlandırma', 'İletişim'].map((item) => (
                  <Link 
                    key={item} 
                    to={`/${item.toLowerCase().replace('ç','c').replace('ö','o').replace('ı','i')}`}
                    className="text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors font-['Outfit']"
                  >
                    {item}
                  </Link>
                ))}
              </nav>
            )}

            {/* SAĞ: Auth Butonları */}
            <div className="flex items-center gap-3">
              {isAuth ? (
                // GİRİŞ YAPILMIŞSA
                <div className="flex items-center gap-3 pl-4 border-l border-gray-200">
                  <div className="hidden md:flex flex-col items-end mr-2">
                    <span className="text-xs font-bold text-slate-800">{user?.ad || 'Kullanıcı'}</span>
                    <span className="text-[10px] text-slate-500 font-medium">Avukat</span>
                  </div>
                  <Link 
                    to="/dashboard" 
                    className="p-2 bg-slate-100 text-slate-600 rounded-full hover:bg-blue-50 hover:text-blue-600 transition-all"
                  >
                    <User size={20} />
                  </Link>
                  <button 
                    onClick={handleLogout}
                    className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-all"
                    title="Çıkış"
                  >
                    <LogOut size={20} />
                  </button>
                </div>
              ) : (
                // GİRİŞ YAPILMAMIŞSA
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setShowLoginModal(true)}
                    className="hidden md:block text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors px-4 py-2 font-['Outfit']"
                  >
                    Giriş Yap
                  </button>
                  <Link
                    to="/register"
                    className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-all shadow-lg shadow-slate-200 hover:shadow-xl font-['Outfit']"
                  >
                    <span>Hemen Başla</span>
                    <ArrowRight size={16} />
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* LOGIN POPUP MODAL (Basit versiyon - API bağlanabilir) */}
      {showLoginModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity"
            onClick={() => setShowLoginModal(false)}
          />
          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl p-8 transform transition-all scale-100">
            <button 
              onClick={() => setShowLoginModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
            >
              <X size={24} />
            </button>
            
            <div className="text-center mb-8">
              <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center mx-auto mb-4 text-blue-600">
                <Lock size={24} />
              </div>
              <h3 className="text-2xl font-bold font-['Outfit'] text-slate-900">Tekrar Hoşgeldiniz</h3>
              <p className="text-slate-500 text-sm mt-1">Miron AI hesabınıza giriş yapın</p>
            </div>

            <div className="space-y-4">
              <Link 
                to="/login"
                onClick={() => setShowLoginModal(false)}
                className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-200"
              >
                Giriş Sayfasına Git
                <ArrowRight size={18} />
              </Link>
              <div className="text-center">
                 <span className="text-xs text-slate-400">veya</span>
              </div>
              <Link 
                to="/register"
                onClick={() => setShowLoginModal(false)}
                className="w-full py-3.5 bg-slate-50 hover:bg-slate-100 text-slate-700 font-medium rounded-xl flex items-center justify-center gap-2 transition-all"
              >
                Hesap Oluştur
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* MOBILE MENU OVERLAY */}
      <div className={`fixed inset-0 z-40 bg-white transform transition-transform duration-300 lg:hidden ${isMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-6">
            <div className="flex items-center justify-between mb-8">
                <span className="font-['Outfit'] font-bold text-2xl text-slate-900">Miron<span className="text-blue-600">AI</span></span>
                <button onClick={() => setIsMenuOpen(false)} className="p-2 text-slate-500"><X size={24} /></button>
            </div>
            <div className="flex flex-col gap-4">
                {['Ana Sayfa', 'Özellikler', 'Fiyatlandırma', 'İletişim'].map((item) => (
                    <Link 
                        key={item}
                        to="/"
                        onClick={() => setIsMenuOpen(false)} 
                        className="text-lg font-medium text-slate-800 py-3 border-b border-gray-50 flex items-center justify-between"
                    >
                        {item}
                        <ChevronRight size={16} className="text-slate-300" />
                    </Link>
                ))}
                 {!isAuth && (
                    <div className="mt-6 flex flex-col gap-3">
                        <Link to="/login" className="w-full py-3 text-center font-bold text-slate-700 bg-slate-50 rounded-xl">Giriş Yap</Link>
                        <Link to="/register" className="w-full py-3 text-center font-bold text-white bg-blue-600 rounded-xl">Ücretsiz Dene</Link>
                    </div>
                 )}
            </div>
        </div>
      </div>
    </>
  );
};

export default Header;