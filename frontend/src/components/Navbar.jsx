import React, { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    // Check local storage for user info
    const storedUser = localStorage.getItem("miron_user");
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (e) {
        console.error("User parse error", e);
      }
    }
  }, []);

  const handleLogout = async () => {
    try {
        const base = import.meta.env.VITE_API_URL || "https://miron22.onrender.com";
        await fetch(`${base}/api/auth/logout`, { method: "POST" });
    } catch(e) {
        console.log("Logout error", e);
    }
    localStorage.removeItem("miron_user");
    localStorage.removeItem("miron_token");
    setUser(null);
    navigate("/login");
  };

  const navLinks = [
    { name: "Ana Sayfa", path: "/home" },
    { name: "Analiz", path: "/analyze" },
    { name: "Yargıtay", path: "/yargitay" },
    { name: "Mevzuat", path: "/mevzuat" },
    { name: "Simülasyon", path: "/simulation" },
    { name: "Sözleşmeler", path: "/contracts" }, // YENİ
  ];

  // Admin link only for admins
  if (user?.role === "admin") {
    navLinks.push({ name: "Admin Panel", path: "/admin" });
  }

  // Public links if not logged in
  if (!user) {
    return (
      <nav className="fixed top-0 left-0 w-full z-50 bg-black/80 backdrop-blur-md border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <Link to="/" className="text-2xl font-bold tracking-tighter text-white">
            Miron<span className="text-[var(--miron-gold)]">.AI</span>
          </Link>
          <div className="flex gap-6">
            <Link to="/login" className="text-white/70 hover:text-white transition">Giriş Yap</Link>
            <Link to="/register" className="px-5 py-2 bg-white text-black rounded-full font-bold hover:bg-gray-200 transition">Kayıt Ol</Link>
          </div>
        </div>
      </nav>
    );
  }

  return (
    <nav className="fixed top-0 left-0 w-full z-50 bg-[#050505]/90 backdrop-blur-xl border-b border-white/5">
      <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
        {/* Logo */}
        <Link to="/home" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-[var(--miron-gold)] rounded-lg flex items-center justify-center font-bold text-black text-xl">M</div>
          <span className="text-xl font-bold tracking-tight text-white">Miron AI</span>
        </Link>

        {/* Desktop Links */}
        <div className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              className={`text-sm font-medium transition-colors ${
                location.pathname === link.path ? "text-[var(--miron-gold)]" : "text-white/60 hover:text-white"
              }`}
            >
              {link.name}
            </Link>
          ))}
        </div>

        {/* Right Side (User & Notifications) */}
        <div className="hidden md:flex items-center gap-6">
          <Link to="/notifications" className="relative group">
             <span className="text-xl">🔔</span>
             {/* Kırmızı nokta eklenebilir eğer okunmamış varsa */}
             <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full"></span>
          </Link>
          
          <div className="relative group">
            <button className="flex items-center gap-3 outline-none">
              <div className="text-right hidden lg:block">
                <div className="text-sm font-bold text-white">{user.firstName} {user.lastName}</div>
                <div className="text-xs text-white/40 uppercase tracking-wider">{user.role === 'admin' ? 'Yönetici' : 'Avukat'}</div>
              </div>
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-700 to-gray-900 border border-white/20 flex items-center justify-center text-white font-bold">
                {user.firstName?.[0]}{user.lastName?.[0]}
              </div>
            </button>
            
            {/* Dropdown */}
            <div className="absolute right-0 top-full mt-2 w-48 bg-[#111] border border-white/10 rounded-xl shadow-2xl py-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all transform origin-top-right">
              <Link to="/settings" className="block px-4 py-2 text-sm text-white/70 hover:bg-white/5 hover:text-white">Ayarlar</Link>
              <Link to="/feedback" className="block px-4 py-2 text-sm text-white/70 hover:bg-white/5 hover:text-white">Geri Bildirim</Link>
              <div className="h-px bg-white/10 my-2"></div>
              <button onClick={handleLogout} className="block w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-white/5">Çıkış Yap</button>
            </div>
          </div>
        </div>

        {/* Mobile Menu Button */}
        <button onClick={() => setMenuOpen(!menuOpen)} className="md:hidden text-white text-2xl">
          {menuOpen ? "✕" : "☰"}
        </button>
      </div>

      {/* Mobile Menu */}
      {menuOpen && (
        <div className="md:hidden bg-[#050505] border-t border-white/10 p-6 absolute w-full left-0 top-20">
          <div className="flex flex-col gap-4">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                onClick={() => setMenuOpen(false)}
                className={`text-lg font-medium ${
                  location.pathname === link.path ? "text-[var(--miron-gold)]" : "text-white/70"
                }`}
              >
                {link.name}
              </Link>
            ))}
            <div className="h-px bg-white/10 my-2"></div>
            <Link to="/notifications" onClick={() => setMenuOpen(false)} className="text-lg text-white/70">Bildirimler</Link>
            <button onClick={handleLogout} className="text-lg text-red-400 text-left">Çıkış Yap</button>
          </div>
        </div>
      )}
    </nav>
  );
}
