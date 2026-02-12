import React from "react";

export default function UserAgreement() {
  return (
    <div className="min-h-screen bg-bg text-fg">
      <div className="max-w-4xl mx-auto px-6 py-16">
        <h1 className="text-3xl md:text-4xl font-extrabold text-accent">
          Kullanıcı Sözleşmesi
        </h1>
        <p className="text-sm text-subtle mt-2">Son Güncelleme: 22.12.2025</p>

        <div className="mt-8 space-y-6 text-fg leading-relaxed">
          <section className="space-y-2">
            <h2 className="text-xl font-semibold text-accent">
              1) Taraflar ve Konu
            </h2>
            <p>
              İşbu sözleşme, Miron Intelligence (“Şirket”) ile Miron AI’yi kullanan
              gerçek/tüzel kişi (“Kullanıcı”) arasında, Hizmet’in kullanım
              koşullarını düzenler.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-xl font-semibold text-accent">
              2) Hizmetin Niteliği
            </h2>
            <p className="text-muted">
              Miron AI, hukuk profesyonellerine yönelik üretken yapay zekâ
              fonksiyonları sağlar. Üretilen çıktılar rehber niteliktedir; nihai
              sorumluluk kullanıcıdadır.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-xl font-semibold text-accent">
              3) Gizlilik ve Dosya İşleme
            </h2>
            <p>
              Kullanıcı, belge yüklediğinde belgenin içerik olarak analiz için
              işlenmesine izin verdiğini kabul eder. Varsayılan prensip:
              <b className="text-fg">
                {" "}
                Dosyalar ve dosya içerikleri kalıcı olarak saklanmaz.
              </b>{" "}
              İşleme tamamlandıktan sonra bellekten temizleme hedeflenir.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-xl font-semibold text-accent">
              4) Kullanıcının Beyan ve Taahhütleri
            </h2>
            <ul className="list-disc pl-6 space-y-1 text-muted">
              <li>Yüklediği içerik üzerinde gerekli hak/izinlere sahip olduğunu</li>
              <li>Gizli bilgileri, müvekkil verilerini ve kişisel verileri hukuka uygun işlediğini</li>
              <li>Çıktıları kontrol edip doğrulayacağını</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-xl font-semibold text-accent">
              5) Ücretlendirme / Paketler
            </h2>
            <p className="text-muted">
              Ücretlendirme, paketler ve deneme süreleri arayüzde veya satış
              kanallarında ayrıca belirtilebilir. (Ödeme altyapısı aktif edildiğinde
              bu bölüm genişletilir.)
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-xl font-semibold text-accent">
              6) Yürürlük ve Fesih
            </h2>
            <p className="text-muted">
              Kullanıcı bu sözleşmeyi onaylayarak yürürlüğe sokar. Şirket, ağır
              ihlal durumunda erişimi askıya alabilir/sonlandırabilir.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-xl font-semibold text-accent">
              7) Uyuşmazlık ve Yetki
            </h2>
            <p className="text-muted">
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
