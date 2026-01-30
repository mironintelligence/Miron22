import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { setLibraUser } from "../utils/auth"; 

export default function Login() {
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Vercel'de çalışması için otomatik URL
  const API_URL = import.meta.env.VITE_API_URL || "https://miron-api.onrender.com"; // Burayı sonra güncelleyeceğiz

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await axios.post(`${API_URL}/auth/token`, form, {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      });
      if (res.data) {
        setLibraUser({ email: form.email, token: res.data.access_token });
        navigate("/dashboard", { replace: true });
      }
    } catch (err) {
      setError("Giriş başarısız.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-900 text-white font-['Outfit']">
      <div className="w-full max-w-md p-8 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20">
        <h1 className="text-2xl font-bold text-center mb-6">Giriş Yap</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input 
            className="w-full p-3 rounded bg-slate-800 border border-slate-700 focus:border-blue-500 outline-none"
            name="email" placeholder="E-posta" onChange={e => setForm({...form, email: e.target.value})} 
          />
          <input 
            className="w-full p-3 rounded bg-slate-800 border border-slate-700 focus:border-blue-500 outline-none"
            type="password" name="password" placeholder="Şifre" onChange={e => setForm({...form, password: e.target.value})} 
          />
          <button disabled={loading} className="w-full p-3 bg-blue-600 rounded hover:bg-blue-700 font-bold">
            {loading ? "..." : "Giriş Yap"}
          </button>
        </form>
        {error && <p className="text-red-400 text-center mt-4">{error}</p>}
      </div>
    </div>
  );
}