import React from "react";

export default function Help() {
  return (
    <div className="min-h-screen bg-[#050505] text-white pt-24 px-6 pb-24">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-3">Yardım ve Kılavuz</h1>
        <p className="text-white/55 text-sm mb-10">
          Miron AI içindeki modüllerin amacı, kullanım adımları ve dikkat edilmesi gereken noktalar.
        </p>

        <div className="space-y-6">
          <section className="bg-[#111] border border-white/10 rounded-2xl p-6">
            <h2 className="text-xl font-bold mb-2">Sözleşme Merkezi</h2>
            <ul className="text-sm text-white/70 space-y-2">
              <li>Şablonlar: Kategorilere göre şablon seçip alanları doldurarak sözleşme metni üretin.</li>
              <li>Otomatik Madde: Gizlilik, fesih, yetkili mahkeme gibi maddeleri tek tıkla ekleyin.</li>
              <li>Risk Analizi: Metni yapıştırın veya PDF/DOCX/TXT yükleyin; risk puanı, eksik maddeler ve uyum kontrollerini görün.</li>
              <li>Karşılaştırma: İki sürümü girin; değişiklikleri ve risk etkisini raporlayın.</li>
              <li>Export: Word/PDF/UDF/UYAP indirme seçenekleriyle çıktıyı alın (dosya bütünlüğü için SHA-256 header döner).</li>
            </ul>
          </section>

          <section className="bg-[#111] border border-white/10 rounded-2xl p-6">
            <h2 className="text-xl font-bold mb-2">Dilekçe Yazarı</h2>
            <ul className="text-sm text-white/70 space-y-2">
              <li>Sol panelden kategori → dilekçe türü seçin.</li>
              <li>Sağ panelde dinamik form alanlarını doldurun.</li>
              <li>Yapay Zekaya Not alanına özel isteklerinizi yazın (üslup, vurgu, ek talepler).</li>
              <li>Önizleme ile bölümlenmiş çıktıyı görün; DOCX/PDF/UDF/UYAP indirerek dışa aktarın.</li>
            </ul>
          </section>

          <section className="bg-[#111] border border-white/10 rounded-2xl p-6">
            <h2 className="text-xl font-bold mb-2">Dava Hatırlatıcı</h2>
            <ul className="text-sm text-white/70 space-y-2">
              <li>Duruşma tarihi/saatini, mahkemeyi ve dosya numarasını kaydedin.</li>
              <li>7 gün önce / 1 gün önce / 1 saat önce gibi çoklu hatırlatma zamanları tanımlayın.</li>
              <li>Arşiv: Tamamlanan davaları arşivleyin; gerektiğinde geri alın.</li>
              <li>E-posta/SMS/Push seçenekleri arayüzde bulunur; e-posta için SMTP yapılandırması gerekir.</li>
            </ul>
          </section>

          <section className="bg-[#111] border border-white/10 rounded-2xl p-6">
            <h2 className="text-xl font-bold mb-2">Bildirimler</h2>
            <ul className="text-sm text-white/70 space-y-2">
              <li>Admin duyuruları ve hatırlatıcı bildirimleri 3 saniyelik popup olarak görünür.</li>
              <li>Bildirim Merkezi ekranında kalıcı olarak listelenir; tıklayınca okundu işaretlenir.</li>
            </ul>
          </section>

          <section className="bg-[#111] border border-white/10 rounded-2xl p-6">
            <h2 className="text-xl font-bold mb-2">Admin Paneli</h2>
            <ul className="text-sm text-white/70 space-y-2">
              <li>Ana menü ve navbar’da sadece admin kullanıcılar “Admin Panel” linkini görür.</li>
              <li>Kullanıcı yönetimi, demo talepleri, indirim kodları, duyuru gönderimi ve sistem ayarları buradan yönetilir.</li>
              <li>Tek kullanıcıya veya tüm kullanıcılara duyuru gönderebilirsiniz.</li>
            </ul>
          </section>

          <section className="bg-[#111] border border-white/10 rounded-2xl p-6">
            <h2 className="text-xl font-bold mb-2">Sık Karşılaşılan Sorunlar</h2>
            <ul className="text-sm text-white/70 space-y-2">
              <li>Yetkisiz erişim: Oturumunuz açılmamışsa korumalı sayfalarda 401 alırsınız.</li>
              <li>PDF/DOCX metin çıkarma: Dosya çok büyükse veya tarama (görüntü) içeriyorsa metin çıkarımı sınırlı olabilir.</li>
              <li>E-posta bildirimleri: SMTP ayarları yoksa e-posta gönderimi gerçekleşmez.</li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}

