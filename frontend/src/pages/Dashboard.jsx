// frontend/src/pages/Dashboard.jsx
import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from "recharts";

const API = `${import.meta.env.VITE_API_URL || "https://miron22.onrender.com"}/stats`;

export default function Dashboard() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch(API);
        const data = await r.json();
        setStats(data);
      } catch (err) {
        console.error("API Hatası:", err);
      }
    })();
  }, []);

  if (!stats)
    return (
      <div className="text-center mt-20 text-gray-400">Yükleniyor...</div>
    );

  const fileTrendData = [
    { day: "Pzt", uploads: stats.total_files - 2 },
    { day: "Sal", uploads: stats.total_files },
    { day: "Çar", uploads: stats.total_files - 1 },
    { day: "Per", uploads: stats.total_files + 1 },
    { day: "Cum", uploads: stats.total_files + 2 },
    { day: "Cmt", uploads: stats.total_files + 3 },
    { day: "Paz", uploads: stats.total_files + 1 }
  ];

  const dilekcePieData = [
    { name: "Boşanma", value: 5 },
    { name: "Tazminat", value: 3 },
    { name: "İcra", value: 2 },
    { name: "Ceza", value: 1 }
  ];

  const COLORS = ["#3b82f6", "#6366f1", "#60a5fa", "#818cf8"];

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.08, delayChildren: 0.05 },
    },
  };

  const item = {
    hidden: { opacity: 0, y: 14 },
    show: { opacity: 1, y: 0, transition: { duration: 0.45 } },
  };

  return (
    <div className="min-h-screen px-6 sm:px-10 md:px-16 py-20 overflow-y-auto">
      <motion.h1
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-3xl font-bold mb-6 text-blue-400"
      >
        Miron AI Raporlama Paneli
      </motion.h1>

      {/* ÜST KARTLAR */}
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6"
      >
        {[
          { title: "Toplam Analiz Edilen Dosya", value: stats.total_files },
          { title: "Toplam Sohbet (Session)", value: stats.total_sessions },
          { title: "Ortalama Kazanma Olasılığı", value: `${stats.avg_success}%` },
          { title: "KVKK Maskeleme Oranı", value: `${stats.kvkk_mask_rate}%` },
          { title: "En Sık Kullanılan Dilekçe", value: stats.top_dilekce },
          { title: "Sistem Durumu", value: stats.system_status }
        ].map((card, i) => (
          <motion.div
            key={i}
            variants={item}
            whileHover={{
              scale: 1.02,
              boxShadow: "0 0 0 1px rgba(59,130,246,0.35), 0 18px 45px rgba(0,0,0,0.45)",
            }}
            className="glass p-6 rounded-2xl text-center shadow-xl"
          >
            <div className="text-sm text-gray-400 mb-1">{card.title}</div>
            <div className="text-2xl font-semibold text-white">
              {card.value}
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* 🔽 GRAFİKLER */}
      <div className="mt-20 space-y-16">
        {/* 📈 Dosya Yükleme Trendi */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55 }}
          viewport={{ once: true }}
          whileHover={{
            boxShadow: "0 0 0 1px rgba(99,102,241,0.30), 0 18px 45px rgba(0,0,0,0.45)",
          }}
          className="glass p-6 rounded-2xl shadow-xl"
        >
          <h2 className="text-xl font-semibold mb-4 text-indigo-400">
            Son 7 Günlük Dosya Yükleme Trendi
          </h2>
          <div style={{ width: "100%", height: 300 }}>
            <ResponsiveContainer>
              <LineChart data={fileTrendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff30" />
                <XAxis dataKey="day" stroke="#aaa" />
                <YAxis stroke="#aaa" />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="uploads"
                  stroke="#3b82f6"
                  strokeWidth={3}
                  dot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* 🧾 Dilekçe Türü Dağılımı */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55 }}
          viewport={{ once: true }}
          whileHover={{
            boxShadow: "0 0 0 1px rgba(59,130,246,0.30), 0 18px 45px rgba(0,0,0,0.45)",
          }}
          className="glass p-6 rounded-2xl shadow-xl"
        >
          <h2 className="text-xl font-semibold mb-4 text-indigo-400">
            Dilekçe Türü Dağılımı
          </h2>
          <div style={{ width: "100%", height: 300 }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  dataKey="value"
                  data={dilekcePieData}
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  fill="#3b82f6"
                  label
                >
                  {dilekcePieData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>

      {/* Footer */}
      <footer className="text-center text-xs text-gray-400 mt-20 py-8 glass border-t border-white/10 rounded-t-2xl">
        ®2025 Miron Intelligence — Tüm hakları saklıdır.
      </footer>
    </div>
  );
}
