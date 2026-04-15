import React from "react";
import { Link } from "react-router-dom";

export default function Unauthorized() {
  return (
    <div className="min-h-screen bg-[#050505] text-white pt-24 px-6 pb-24">
      <div className="max-w-xl mx-auto bg-[#111] border border-white/10 rounded-2xl p-8">
        <div className="text-3xl mb-3"></div>
        <h1 className="text-2xl font-bold mb-2">Yetkisiz Erişim</h1>
        <p className="text-white/60 text-sm mb-6">
          Bu sayfaya erişmek için admin rolüne sahip olmanız gerekiyor.
        </p>
        <div className="flex gap-3">
          <Link to="/dashboard" className="px-4 py-2 rounded-xl bg-white/10 border border-white/10 hover:bg-white/15">
            Ana Menü
          </Link>
          <Link to="/feedback" className="px-4 py-2 rounded-xl bg-white/10 border border-white/10 hover:bg-white/15">
            Destek
          </Link>
        </div>
      </div>
    </div>
  );
}

