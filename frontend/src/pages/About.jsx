import React from "react";
import { Link } from "react-router-dom";

export default function About() {
  return (
    <div className="min-h-screen bg-black text-white pt-24 px-6 pb-20">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold mb-6">Miron Intelligence</h1>
          <p className="text-xl text-white/50 max-w-2xl mx-auto">
            Hukuk, finans ve gayrimenkul teknolojilerinde geleceği inşa ediyoruz.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-12 mb-20 items-center">
          <div>
            <h2 className="text-3xl font-bold mb-6 text-[var(--miron-gold)]">Biz Kimiz?</h2>
            <p className="text-lg text-white/70 leading-relaxed mb-6">
              Miron Intelligence, yapay zeka destekli karar destek sistemleri geliştiren global bir teknoloji şirketidir. 
              Geleneksel sektörlerin (Hukuk, Otelcilik, İnşaat) dijital dönüşümünü, sadece otomasyonla değil, 
              derinlemesine akıl yürütme (reasoning) yeteneğine sahip yapay zeka modelleriyle gerçekleştiriyoruz.
            </p>
            <p className="text-lg text-white/70 leading-relaxed">
              Milyar dolarlık gayrimenkul projelerinden, uluslararası hukuk bürolarına kadar geniş bir yelpazede, 
              operasyonel verimliliği maksimize eden ve riski minimize eden altyapılar kuruyoruz.
            </p>
          </div>
          <div className="relative">
            <div className="aspect-square rounded-full bg-gradient-to-br from-[var(--miron-gold)]/20 to-transparent blur-[100px] absolute inset-0" />
            <div className="relative z-10 border border-white/10 bg-[#111] p-8 rounded-3xl">
              <ul className="space-y-6">
                <li className="flex gap-4">
                  <span className="text-2xl">🌍</span>
                  <div>
                    <h3 className="font-bold text-white">Global Vizyon</h3>
                    <p className="text-sm text-white/50">3 kıtada operasyonel yetenek.</p>
                  </div>
                </li>
                <li className="flex gap-4">
                  <span className="text-2xl">🧠</span>
                  <div>
                    <h3 className="font-bold text-white">Derin Teknoloji</h3>
                    <p className="text-sm text-white/50">Kendi eğittiğimiz özelleşmiş dil modelleri.</p>
                  </div>
                </li>
                <li className="flex gap-4">
                  <span className="text-2xl">🔒</span>
                  <div>
                    <h3 className="font-bold text-white">Veri Güvenliği</h3>
                    <p className="text-sm text-white/50">Enterprise seviyesinde şifreleme ve gizlilik.</p>
                  </div>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className="border-t border-white/10 pt-20">
          <h2 className="text-3xl font-bold mb-10 text-center">Kurumsal Değerlerimiz</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="p-6 rounded-2xl bg-[#111] border border-white/5 hover:border-[var(--miron-gold)]/30 transition-colors">
              <h3 className="text-xl font-bold mb-3">İnovasyon</h3>
              <p className="text-white/60">Sürekli gelişim ve sınırları zorlayan teknolojik çözümler.</p>
            </div>
            <div className="p-6 rounded-2xl bg-[#111] border border-white/5 hover:border-[var(--miron-gold)]/30 transition-colors">
              <h3 className="text-xl font-bold mb-3">Güven</h3>
              <p className="text-white/60">Müşteri verilerinin gizliliği ve sistem güvenilirliği önceliğimizdir.</p>
            </div>
            <div className="p-6 rounded-2xl bg-[#111] border border-white/5 hover:border-[var(--miron-gold)]/30 transition-colors">
              <h3 className="text-xl font-bold mb-3">Mükemmeliyet</h3>
              <p className="text-white/60">En ince detaya kadar düşünülmüş, hatasız kullanıcı deneyimi.</p>
            </div>
          </div>
        </div>
        
        <div className="mt-20 text-center">
           <Link to="/contact" className="inline-block px-8 py-4 bg-[var(--miron-gold)] text-black font-bold rounded-full hover:brightness-110 transition">
             İletişime Geçin
           </Link>
        </div>
      </div>
    </div>
  );
}
