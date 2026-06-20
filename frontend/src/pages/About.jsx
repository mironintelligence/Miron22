import React from "react";
import { Link } from "react-router-dom";
import { ExternalLink } from "lucide-react";

function ProductCard({ badge, badgeColor = "text-[var(--miron-gold)] border-[var(--miron-gold)]/30 bg-[var(--miron-gold)]/5", title, subtitle, description, features, cta, ctaHref, ctaExternal, comingSoon }) {
  return (
    <div className="relative border border-white/10 bg-[#0d0d0d] p-8 md:p-10 rounded-2xl overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-[1px]" style={{ background: 'linear-gradient(90deg, transparent, #FFD70055, transparent)' }} />
      <div className={`inline-flex items-center gap-2 px-3 py-1 border rounded-full text-[10px] font-bold tracking-[0.2em] uppercase mb-5 ${badgeColor}`}>
        {badge}
        {comingSoon && <span className="ml-1 px-1.5 py-0.5 bg-white/10 text-white/60 rounded text-[9px]">YAKINDA</span>}
      </div>
      <h2 className="text-2xl md:text-3xl font-bold text-white mb-1">{title}</h2>
      {subtitle && <p className="text-sm text-[var(--miron-gold)] mb-4">{subtitle}</p>}
      <p className="text-white/60 leading-relaxed mb-6">{description}</p>
      {features && (
        <ul className="space-y-2 mb-8">
          {features.map((f) => (
            <li key={f} className="flex items-start gap-2 text-sm text-white/50">
              <span className="text-[var(--miron-gold)] mt-0.5 shrink-0">–</span>
              {f}
            </li>
          ))}
        </ul>
      )}
      {cta && ctaHref && (
        ctaExternal ? (
          <a
            href={ctaHref}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-2.5 border border-[var(--miron-gold)]/50 text-[var(--miron-gold)] text-sm font-semibold hover:bg-[var(--miron-gold)]/10 transition-colors rounded-full"
          >
            {cta} <ExternalLink size={14} />
          </a>
        ) : (
          <Link
            to={ctaHref}
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-[var(--miron-gold)] text-black text-sm font-bold hover:opacity-85 transition-opacity rounded-full"
          >
            {cta}
          </Link>
        )
      )}
    </div>
  );
}

export default function About() {
  return (
    <div className="premium-scope min-h-screen bg-black text-white pt-24 px-6 pb-24">
      <div className="max-w-5xl mx-auto">

        {/* Hero */}
        <div className="text-center mb-20">
          <p className="text-[11px] font-bold tracking-[0.28em] uppercase text-white/30 mb-4">Miron Group LLC</p>
          <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
            Yapay Zeka ile{" "}
            <span className="bg-gradient-to-r from-[var(--miron-gold)] to-amber-300 bg-clip-text text-transparent">
              Endüstrileri Dönüştürüyoruz
            </span>
          </h1>
          <p className="text-lg text-white/50 max-w-2xl mx-auto leading-relaxed">
            Miron Group LLC, farklı sektörlere özel yapay zeka çözümleri geliştiren bir teknoloji şirketidir.
            Her ürün, ilgili sektörün gerçek ihtiyaçları için sıfırdan inşa edilir.
          </p>
        </div>

        {/* Ürünler */}
        <div className="space-y-6 mb-20">

          {/* Luna AI */}
          <ProductCard
            badge="Luna AI"
            title="Konaklama Sektörünün Zekası"
            subtitle="Oteller için entegre yapay zeka yönetim platformu"
            description="Luna AI, otellerin tüm departmanlarında kesintisiz çalışan bir zeka katmanıdır. WhatsApp üzerinden 40+ dilde misafir iletişimi, gerçek zamanlı duygu analizi, PMS/OTA entegrasyonu ve dinamik fiyatlandırma tek platformda birleşir."
            features={[
              "40+ dil desteği, 3 saniye altı yanıt süresi",
              "Opera, Protel, Booking.com, Expedia entegrasyonu",
              "Oda bazlı enerji takibi ve stok yönetimi",
              "Personel performansı ve görev yönetimi",
              "%99,9 çalışma süresi garantisi",
            ]}
            cta="Luna AI'ı Keşfet"
            ctaHref="https://www.mirongroup.llc"
            ctaExternal
          />

          {/* Miron AI */}
          <ProductCard
            badge="Miron AI"
            badgeColor="text-amber-300 border-amber-300/30 bg-amber-300/5"
            title="Türk Hukukunun Yapay Zekası"
            subtitle="Avukatlar ve hukuk ekipleri için sektöre özel AI platformu"
            description="Miron AI, Türk hukuku odaklı tek platform. Yargıtay ve Danıştay emsal araması, dilekçe üretimi, sözleşme analizi, risk stratejisi ve 11 hukuki hesaplama motoru tek çatı altında."
            features={[
              "Yargıtay & Danıştay emsal tarama (RAG destekli)",
              "Dilekçe ve sözleşme üretimi",
              "Dava riski ve strateji analizi",
              "Faiz, kıdem, ihbar, vekalet hesaplama motorları",
              "KVKK uyumlu altyapı, uçtan uca şifreleme",
            ]}
            cta="Platforma Git"
            ctaHref="/dashboard"
          />

          {/* PARCEL AI */}
          <ProductCard
            badge="PARCEL AI"
            badgeColor="text-white/40 border-white/10 bg-white/3"
            title="Lojistik ve Dağıtım Zekası"
            subtitle="Yeni nesil parsel ve dağıtım optimizasyonu"
            description="PARCEL AI, lojistik sektörü için geliştirilen yapay zeka çözümüdür. Rota optimizasyonu, teslimat tahmini ve filo yönetimini tek akıllı sistemde birleştirecek."
            comingSoon
          />
        </div>

        {/* Şirket Notu */}
        <div className="border-t border-white/10 pt-14 text-center">
          <p className="text-sm text-white/35 max-w-xl mx-auto leading-relaxed">
            Miron Group LLC bünyesinde geliştirilen tüm ürünler KVKK ve GDPR uyumludur.
            Veriler ilgili ülke mevzuatına göre işlenir ve saklanır.
          </p>
          <div className="mt-8">
            <Link
              to="/contact"
              className="inline-block px-8 py-3 border border-white/20 text-white/60 text-sm font-semibold hover:border-[var(--miron-gold)]/50 hover:text-[var(--miron-gold)] transition-colors rounded-full"
            >
              İletişime Geçin
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}
