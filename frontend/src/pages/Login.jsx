import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { setLibraUser } from "../utils/auth"; // Artık hata vermeyecek

export default function Login() {
  const [form, setForm] = useState({
    email: "", // Backend email bekliyor olabilir, firstName yerine
    password: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // API Adresini Otomatik Belirle (Vercel'de Environment, Lokalde 8001)
  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8001";

  const handleChange = (e) =>
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // Dinamik URL kullanımı
      const res = await axios.post(`${API_URL}/auth/token`, form, {
        headers: { "Content-Type": "application/x-www-form-urlencoded" }, // OAuth2 standardı
      });

      // Başarılı Giriş
      if (res.data) {
        // Token ve User bilgisini kaydet
        // Backend yapına göre burayı özelleştirebiliriz, şimdilik standart varsayıyoruz
        const userData = { 
            email: form.email, 
            token: res.data.access_token 
        };
        
        setLibraUser(userData);
        navigate("/dashboard", { replace: true });
      }

    } catch (err) {
      console.error("Login Error:", err);
      setError("Giriş başarısız. Kullanıcı adı veya şifre hatalı.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-900 text-gray-100 font-['Outfit']">
      <div className="w-full max-w-md p-8 bg-white/5 backdrop-blur-xl rounded-3xl border border-white/10 shadow-2xl">
        <h1 className="text-3xl font-bold mb-2 text-center text-white">
          Tekrar Hoşgeldiniz
        </h1>
        <p className="text-slate-400 text-center mb-8 text-sm">Miron AI hesabınıza erişin</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <input
              name="email"
              type="text" // Username veya Email
              placeholder="E-posta Adresi"
              value={form.email}
              onChange={handleChange}
              required
              className="w-full px-4 py-3 rounded-xl bg-slate-800/50 border border-slate-700 text-white placeholder-slate-500 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
            />
          </div>
          <div>
            <input
              type="password"
              name="password"
              placeholder="Şifre"
              value={form.password}
              onChange={handleChange}
              required
              className="w-full px-4 py-3 rounded-xl bg-slate-800/50 border border-slate-700 text-white placeholder-slate-500 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-all shadow-lg shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed mt-4"
          >
            {loading ? "Giriş Yapılıyor..." : "Giriş Yap"}
          </button>
        </form>

        {error && (
          <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm text-center">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}