import React from "react";
import { Link } from "react-router-dom";
import { ExternalLink } from "lucide-react";

export default function About() {
  return (
    <div className="premium-scope min-h-screen bg-black text-white pt-24 px-6 pb-24">
      <div className="max-w-3xl mx-auto">

        {/* Hero */}
        <div className="mb-20">
          <p className="text-[11px] font-bold tracking-[0.28em] uppercase text-white/30 mb-5">Miron Group LLC</p>
          <h1 className="text-4xl md:text-5xl font-bold mb-8 leading-tight">
            Yapay zekâyı gerçek işlere<br />
            <span className="bg-clip-text text-transparent" style={{ background: 'linear-gradient(90deg, #ebac00, #b88700)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              taşıyoruz.
            </span>
          </h1>
          <p className="text-lg text-white/55 leading-relaxed mb-6">
            Miron Group LLC; hukuk, turizm ve emlak gibi yoğun operasyonlu sektörlerde çalışan profesyoneller için yapay zekâ sistemleri geliştiren bir teknoloji şirketidir.
          </p>
          <p className="text-lg text-white/55 leading-relaxed">
            Kurduğumuz ürünlerin hiçbiri "genel amaçlı" değildir. Her biri, o sektörün gerçek ağırlığını bilen insanlarla birlikte, o sektörün tam ortasında inşa edilmiştir. Avukat nasıl çalışır, otel yöneticisi sabah 6'da hangi soruyla uğraşır, emlak danışmanı müşteriyle ilk görüşmede hangi belgeye ihtiyaç duyar — bunları bilerek tasarlarız.
          </p>
        </div>

        {/* Divider */}
        <div className="border-t border-white/8 mb-20" />

        {/* Luna AI */}
        <div className="mb-20">
          <div className="flex items-center gap-3 mb-6">
            <span className="text-[10px] font-bold tracking-[0.25em] uppercase px-3 py-1 border border-[var(--miron-gold)]/30 text-[var(--miron-gold)] bg-[var(--miron-gold)]/5">
              Luna AI
            </span>
            <span className="text-[11px] text-white/25">Turizm & Konaklama</span>
          </div>

          <h2 className="text-3xl font-bold text-white mb-5">
            Otelin her anını yöneten zekâ
          </h2>

          <p className="text-white/60 leading-relaxed mb-5">
            Bir otel; resepsiyon, kat hizmetleri, restoran, teknik servis, rezervasyon ve misafir ilişkileri gibi onlarca departmanın eş zamanlı çalıştığı, dakikalar içinde yüzlerce kararın alındığı bir sistemdir. Bu sistemin içinde insan hatası kaçınılmazdır — ama çoğu hata aslında bilgi eksikliğinden değil, bilgiye zamanında ulaşamamaktan kaynaklanır.
          </p>
          <p className="text-white/60 leading-relaxed mb-5">
            Luna AI bu boşluğu kapatmak için tasarlandı. Otelin tüm departmanlarında kesintisiz çalışan bir zekâ katmanı olarak konumlandırılan Luna, misafirle WhatsApp üzerinden 40'tan fazla dilde anlık iletişim kurar, gelen her mesajı içeriğine ve aciliyetine göre ilgili departmana yönlendirir. Bir şikâyet, bir talep, bir soru — hepsi 3 saniyenin altında yanıt alır.
          </p>
          <p className="text-white/60 leading-relaxed mb-5">
            Bunun ötesinde Luna, arka planda da çalışır. Oda bazlı enerji tüketimini izler, stok seviyelerini takip eder, personel görev yönetimini destekler ve gelir optimizasyonu için dinamik fiyatlandırma önerileri üretir. Opera, Protel, Booking.com ve Expedia gibi sistemlerle entegre çalışarak otelin mevcut altyapısını değiştirmeye gerek duymaz — onun üzerine oturur.
          </p>
          <p className="text-white/60 leading-relaxed mb-8">
            Luna AI'yı kullanan oteller, misafir memnuniyetinde ölçülebilir artış yaşarken operasyonel yük önemli ölçüde azalır. Teknoloji vakit kazandırır; o vakit misafire ayrılır.
          </p>

          <a
            href="https://www.mirongroup.llc"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm text-[var(--miron-gold)] border border-[var(--miron-gold)]/30 px-5 py-2.5 hover:bg-[var(--miron-gold)]/8 transition-colors"
          >
            Luna AI'yı incele <ExternalLink size={13} />
          </a>
        </div>

        {/* Divider */}
        <div className="border-t border-white/8 mb-20" />

        {/* Miron AI */}
        <div className="mb-20">
          <div className="flex items-center gap-3 mb-6">
            <span className="text-[10px] font-bold tracking-[0.25em] uppercase px-3 py-1 border border-[#ebac00]/30 text-[#ebac00] bg-[#ebac00]/5">
              Miron AI
            </span>
            <span className="text-[11px] text-white/25">Hukuk</span>
          </div>

          <h2 className="text-3xl font-bold text-white mb-5">
            Türk hukuku için sıfırdan inşa edilmiş platform
          </h2>

          <p className="text-white/60 leading-relaxed mb-5">
            Avukatlık; sadece hukuku bilmekle değil, o bilgiyi doğru formatta, doğru zamanda, doğru kişiye iletmekle değer yaratır. Ancak Türk hukukunun karmaşıklığı, sürekli değişen mevzuat yapısı ve yargı kararlarının hacmi bu işi giderek zorlaştırmaktadır. Dosya hazırlamak, emsal aramak, dilekçe yazmak, hesaplamalar yapmak — bunların hepsi zaman çalar. Ve hukuk bürosunda zaman en kıt kaynaktır.
          </p>
          <p className="text-white/60 leading-relaxed mb-5">
            Miron AI bu yükü azaltmak için kuruldu. Platform; Yargıtay ve Danıştay kararlarını RAG (Retrieval-Augmented Generation) teknolojisiyle tarayarak avukata emsal bulur, belirlenen dava stratejisini analiz ederek risk öngörüsü üretir, dilekçe ve sözleşme taslakları hazırlar. 11 farklı hukuki hesaplama motoru — faiz, kıdem tazminatı, ihbar, vekâlet ücreti, harç, icra masrafları ve daha fazlası — dakikalar içinde sonuç verir.
          </p>
          <p className="text-white/60 leading-relaxed mb-8">
            Tüm bunlar KVKK uyumlu altyapı üzerinde, uçtan uca şifrelenmiş ortamda çalışır. Veriler işlenmez, üçüncü taraflarla paylaşılmaz. Platform bir asistan değil; avukatın yanındaki sessiz ama güçlü bir ekip üyesidir.
          </p>

          <Link
            to="/dashboard"
            className="inline-flex items-center gap-2 text-sm text-black font-bold bg-[var(--miron-gold)] px-5 py-2.5 hover:opacity-85 transition-opacity"
          >
            Platforma git →
          </Link>
        </div>

        {/* Divider */}
        <div className="border-t border-white/8 mb-20" />

        {/* PARCEL AI */}
        <div className="mb-20">
          <div className="flex items-center gap-3 mb-6">
            <span className="text-[10px] font-bold tracking-[0.25em] uppercase px-3 py-1 border border-white/15 text-white/40 bg-white/3">
              PARCEL AI
            </span>
            <span className="text-[11px] text-white/25">Emlak</span>
            <span className="text-[9px] font-bold tracking-[0.2em] uppercase px-2 py-0.5 bg-white/8 text-white/35 rounded">
              YAKINDA
            </span>
          </div>

          <h2 className="text-3xl font-bold text-white mb-5">
            Emlak danışmanının en büyük sorunu: zaman
          </h2>

          <p className="text-white/55 leading-relaxed mb-5">
            Bir emlak danışmanı gün içinde onlarca müşteriyle ilgilenir, her biri için farklı portföy hazırlar, tapu sorguları yapar, sözleşme süreçlerini yönetir, banka ve noter randevularını organize eder. Bu süreçlerin büyük bölümü tekrarlayan, rutin ve ama kaçırılması durumunda ciddi sonuçlar doğuran işlemlerden oluşur.
          </p>
          <p className="text-white/55 leading-relaxed mb-5">
            PARCEL AI, Türkiye emlak sektörüne özel geliştirilmekte olan yapay zekâ platformudur. Danışmanın portföy yönetimini, müşteri eşleştirmesini, belge hazırlama süreçlerini ve satış akışını tek bir akıllı sistemde birleştirecek. Tapu ve TKGM sorgu entegrasyonları, otomatik sözleşme taslakları, müşteri bazlı portföy önerileri ve randevu takip sistemi PARCEL AI'nın temel bileşenleri arasında yer alacak.
          </p>
          <p className="text-white/55 leading-relaxed">
            Şu an geliştirme aşamasında olan PARCEL AI, yakın zamanda erken erişim programıyla seçili emlak ofislerine açılacak.
          </p>
        </div>

        {/* Footer notu */}
        <div className="border-t border-white/8 pt-14 text-center">
          <p className="text-sm text-white/30 max-w-xl mx-auto leading-relaxed mb-8">
            Miron Group LLC bünyesinde geliştirilen tüm ürünler KVKK ve GDPR uyumludur.
            Veriler ilgili ülke mevzuatına göre işlenir ve saklanır.
          </p>
          <Link
            to="/contact"
            className="inline-block px-7 py-3 border border-white/15 text-white/50 text-sm hover:border-[var(--miron-gold)]/40 hover:text-[var(--miron-gold)] transition-colors"
          >
            İletişime Geçin
          </Link>
        </div>

      </div>
    </div>
  );
}
