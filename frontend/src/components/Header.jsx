import React, { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Menu, X, ArrowRight, User, LogOut, ChevronRight, Zap, ShieldCheck } from "lucide-react";
import { isAuthenticated, logout, getUserData } from "../utils/auth";

const Header = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [user, setUser] = useState(null);
  
  const navigate = useNavigate();
  const location = useLocation();
  const isAuth = isAuthenticated();

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    if(isAuth) setUser(getUserData());
    return () => window.removeEventListener("scroll", handleScroll);
  }, [isAuth]);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const isActive = (path) => location.pathname === path;

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ease-in-out border-b ${
          isScrolled
            ? "bg-slate-900/80 backdrop-blur-xl border-slate-800 py-3 shadow-lg"
            : "bg-transparent border-transparent py-6"
        }`}
      >
        <div className="container mx-auto px-6 md:px-12">
          <div className="flex items-center justify-between">
            
            {/* --- LOGO ALANI (TÜRKÇELEŞTİRİLDİ) --- */}
            <Link to={isAuth ? "/dashboard" : "/"} className="flex items-center gap-3 group">
              <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 shadow-lg shadow-blue-500/20 group-hover:shadow-blue-500/40 transition-all duration-300">
                <Zap size={20} className="text-white fill-white" />
                <div className="absolute inset-0 rounded-xl bg-white/20 blur-md opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              </div>
              <div className="flex flex-col">
                <span className={`font-['Outfit'] font-bold text-xl tracking-tight leading-none ${isScrolled ? 'text-white' : 'text-slate-900 dark:text-white'}`}>
                  Miron<span className="text-blue-500">AI</span>
                </span>
                <span className="text-[10px] font-medium text-slate-500 tracking-widest uppercase mt-0.5">
                  Yapay Zeka Teknolojileri
                </span>
              </div>
            </Link>

            {/* --- ORTA MENÜ --- */}
            {!isAuth && (
              <nav className="hidden lg:flex items-center gap-1 p-1 bg-slate-100/5 border border-white/10 rounded-full backdrop-blur-md">
                {[
                  { name: 'Ana Sayfa', path: '/' },
                  { name: 'Özellikler', path: '/features' },
                  { name: 'Fiyatlandırma', path: '/pricing' },
                  { name: 'İletişim', path: '/contact' }
                ].map((item) => (
                  <Link 
                    key={item.name} 
                    to={item.path}
                    className={`px-5 py-2 rounded-full text-sm font-medium transition-all duration-300 ${
                      isActive(item.path)
                        ? "bg-white text-slate-900 shadow-sm"
                        : "text-slate-400 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    {item.name}
                  </Link>
                ))}
              </nav>
            )}

            {/* --- SAĞ AKSİYONLAR --- */}
            <div className="flex items-center gap-4">
              {isAuth ? (
                <div className="flex items-center gap-3 pl-6 border-l border-slate-700/50">
                   <div className="hidden md:flex flex-col items-end">
                      <span className="text-sm font-bold text-white">{user?.ad || 'Avukat'}</span>
                      <span className="text-[10px] text-blue-400 font-medium flex items-center gap-1">
                        <ShieldCheck size={10} /> Profesyonel Plan
                      </span>
                   </div>
                   
                   <button 
                     onClick={() => navigate('/dashboard')}
                     className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 hover:border-blue-500/50 flex items-center justify-center text-slate-300 hover:text-white transition-all"
                   >
                      <User size={18} />
                   </button>

                   <button
                    onClick={handleLogout}
                    className="w-10 h-10 rounded-full bg-red-500/10 border border-red-500/20 hover:bg-red-500 text-red-400 hover:text-white transition-all duration-300"
                    title="Çıkış Yap"
                   >
                     <LogOut size={16} />
                   </button>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <Link
                    to="/login"
                    className={`hidden md:flex text-sm font-semibold transition-colors px-4 py-2 ${
                        isScrolled ? 'text-slate-300 hover:text-white' : 'text-slate-600 hover:text-slate-900 dark:text-slate-300'
                    }`}
                  >
                    Giriş Yap
                  </Link>
                  <Link
                    to="/register"
                    className="group relative px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold rounded-xl shadow-lg transition-all duration-300 overflow-hidden"
                  >
                    <span className="relative z-10 flex items-center gap-2">
                      Hemen Başla <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                    </span>
                    <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
                  </Link>
                </div>
              )}

              <button onClick={() => setIsMenuOpen(true)} className="lg:hidden p-2 text-white">
                <Menu size={24} />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* --- MOBİL MENÜ --- */}
      <div className={`fixed inset-0 z-[60] bg-slate-900/95 backdrop-blur-xl transition-all duration-500 ${isMenuOpen ? "opacity-100" : "opacity-0 pointer-events-none"}`}>
        <div className="p-6 h-full flex flex-col">
            <div className="flex items-center justify-between mb-12">
                <span className="font-['Outfit'] font-bold text-2xl text-white">Miron<span className="text-blue-500">AI</span></span>
                <button onClick={() => setIsMenuOpen(false)} className="p-2 text-slate-400"><X size={24} /></button>
            </div>
            <nav className="flex flex-col gap-6">
                {['Ana Sayfa', 'Özellikler', 'Fiyatlandırma', 'İletişim'].map((name) => (
                    <Link key={name} to="/" onClick={() => setIsMenuOpen(false)} className="text-2xl font-medium text-slate-300 hover:text-white flex items-center justify-between">
                        {name} <ChevronRight size={20} />
                    </Link>
                ))}
            </nav>
            {!isAuth && (
                <div className="mt-auto mb-8 flex flex-col gap-4">
                    <Link to="/login" onClick={() => setIsMenuOpen(false)} className="w-full py-4 text-center font-bold text-white bg-slate-800 rounded-xl border border-slate-700">Giriş Yap</Link>
                    <Link to="/register" onClick={() => setIsMenuOpen(false)} className="w-full py-4 text-center font-bold text-white bg-blue-600 rounded-xl">Hemen Başla</Link>
                </div>
            )}
        </div>
      </div>
    </>
  );
};

export default Header;