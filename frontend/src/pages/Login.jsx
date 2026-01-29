// src/pages/Login.jsx
import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { setLibraUser } from "../utils/auth";

export default function Login() {
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) =>
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await axios.post("http://localhost:8000/api/login", form, {
        headers: { "Content-Type": "application/json" },
      });

      if (res?.data?.status === "ok" && res?.data?.user) {
        // ✅ her zaman kalıcı login
        setLibraUser(res.data.user);
        navigate("/home", { replace: true });
        return;
      }

      setError("Giriş başarısız. Bilgilerinizi kontrol edin.");
    } catch (err) {
      const msg =
        err?.response?.data?.detail ||
        err?.response?.data?.message ||
        err?.message ||
        "Giriş başarısız.";
      setError(msg);
      console.error("Login Error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-[#0b0b0c] to-[#17181b] text-gray-100">
      <h1 className="text-3xl font-bold mb-6 bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
        MIRON AI Giriş
      </h1>

      <form
        onSubmit={handleSubmit}
        className="bg-white/5 p-6 rounded-2xl border border-white/10 shadow-lg w-80"
      >
        <input
          name="firstName"
          placeholder="Ad"
          value={form.firstName}
          onChange={handleChange}
          required
          className="w-full mb-3 px-4 py-2 rounded-xl bg-white/10 border border-white/20 text-white placeholder-gray-400 focus:ring-2 focus:ring-cyan-400 outline-none"
        />
        <input
          name="lastName"
          placeholder="Soyad"
          value={form.lastName}
          onChange={handleChange}
          required
          className="w-full mb-3 px-4 py-2 rounded-xl bg-white/10 border border-white/20 text-white placeholder-gray-400 focus:ring-2 focus:ring-cyan-400 outline-none"
        />
        <input
          type="email"
          name="email"
          placeholder="E-posta"
          value={form.email}
          onChange={handleChange}
          required
          className="w-full mb-3 px-4 py-2 rounded-xl bg-white/10 border border-white/20 text-white placeholder-gray-400 focus:ring-2 focus:ring-cyan-400 outline-none"
        />
        <input
          type="password"
          name="password"
          placeholder="Şifre"
          value={form.password}
          onChange={handleChange}
          required
          className="w-full mb-4 px-4 py-2 rounded-xl bg-white/10 border border-white/20 text-white placeholder-gray-400 focus:ring-2 focus:ring-cyan-400 outline-none"
        />

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 font-semibold hover:opacity-90 disabled:opacity-60"
        >
          {loading ? "Giriş Yapılıyor..." : "Giriş Yap"}
        </button>
      </form>

      {error && <p className="mt-4 text-red-400">{error}</p>}
    </div>
  );
}