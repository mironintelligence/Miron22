import React from "react";

export default function UserAgreement() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0b0b0c] to-[#17181b] text-gray-100">
      <div className="max-w-4xl mx-auto px-6 py-16">
        <h1 className="text-3xl md:text-4xl font-extrabold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
          Kullanıcı Sözleşmesi
        </h1>
        <p className="text-sm text-gray-400 mt-2">Son Güncelleme: 22.12.2025</p>

        <div className="mt-8 space-y-6 text-gray-200 leading-relaxed">
          <section className="space-y-2">
            <h2 className="text-xl font-semibold text-cyan-300">
              1) Taraflar ve Konu
            </h2>
            <p>
              İşbu sözleşme, Miron Intelligence (“Şirket”) ile Miron AI’yi kullanan
              gerçek/tüzel kişi (“Kullanıcı”) arasında, Hizmet’in kullanım
              koşullarını düzenler.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-xl font-semibold text-cyan-300">
              2) Hizmetin Niteliği
            </h2>
            <p className="text-gray-300">
              Miron AI, hukuk profesyonellerine yönelik üretken yapay zekâ
              fonksiyonları sağlar. Üretilen çıktılar rehber niteliktedir; nihai
              sorumluluk kullanıcıdadır.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-xl font-semibold text-cyan-300">
              3) Gizlilik ve Dosya İşleme
            </h2>
            <p>
              Kullanıcı, belge yüklediğinde belgenin içerik olarak analiz için
              işlenmesine izin verdiğini kabul eder. Varsayılan prensip:
              <b className="text-gray-100">
                {" "}
                Dosyalar ve dosya içerikleri kalıcı olarak saklanmaz.
              </b>{" "}
              İşleme tamamlandıktan sonra bellekten temizleme hedeflenir.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-xl font-semibold text-cyan-300">
              4) Kullanıcının Beyan ve Taahhütleri
            </h2>
            <ul className="list-disc pl-6 space-y-1 text-gray-300">
              <li>Yüklediği içerik üzerinde gerekli hak/izinlere sahip olduğunu</li>
              <li>Gizli bilgileri, müvekkil verilerini ve kişisel verileri hukuka uygun işlediğini</li>
              <li>Çıktıları kontrol edip doğrulayacağını</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-xl font-semibold text-cyan-300">
              5) Ücretlendirme / Paketler
            </h2>
            <p className="text-gray-300">
              Ücretlendirme, paketler ve deneme süreleri arayüzde veya satış
              kanallarında ayrıca belirtilebilir. (Ödeme altyapısı aktif edildiğinde
              bu bölüm genişletilir.)
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-xl font-semibold text-cyan-300">
              6) Yürürlük ve Fesih
            </h2>
            <p className="text-gray-300">
              Kullanıcı bu sözleşmeyi onaylayarak yürürlüğe sokar. Şirket, ağır
              ihlal durumunda erişimi askıya alabilir/sonlandırabilir.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-xl font-semibold text-cyan-300">
              7) Uyuşmazlık ve Yetki
            </h2>
            <p className="text-gray-300">
              Uyuşmazlıklarda Türkiye Cumhuriyeti hukuku uygulanır. Yetkili
              mahkeme/mercii, Şirket’in merkezinin bulunduğu yer esas alınarak
              belirlenebilir (güncel adres/merkez bilgisi ayrıca duyurulur).
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}