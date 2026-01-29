import React from "react";

export default function Terms() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0b0b0c] to-[#17181b] text-gray-100">
      <div className="max-w-4xl mx-auto px-6 py-16">
        <h1 className="text-3xl md:text-4xl font-extrabold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
          Kullanım Şartları
        </h1>
        <p className="text-sm text-gray-400 mt-2">Son Güncelleme: 22.12.2025</p>

        <div className="mt-8 space-y-6 text-gray-200 leading-relaxed">
          <section className="space-y-2">
            <h2 className="text-xl font-semibold text-cyan-300">
              1) Kabul ve Kapsam
            </h2>
            <p>
              Miron AI’ye erişerek ve/veya hesap oluşturarak bu Kullanım Şartları’nı
              kabul etmiş olursunuz. Kabul etmiyorsanız Hizmet’i kullanmayınız.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-xl font-semibold text-cyan-300">
              2) Hizmet Tanımı
            </h2>
            <p>
              Miron AI; belge analizi, özetleme, metin üretimi ve KRM Assistant
              üzerinden soru-cevap gibi yapay zekâ destekli araçlar sağlar.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-xl font-semibold text-cyan-300">
              3) Hukuki Uyarı (Çok Net)
            </h2>
            <p>
              Miron AI’nin çıktıları <b>hukuki danışmanlık değildir</b>. Nihai
              değerlendirme ve sorumluluk kullanıcıya (avukata/hukuk
              profesyoneline) aittir. Miron AI tarafından üretilen içerikler
              hatalı/eksik olabilir; her zaman kaynak mevzuat ve içtihat üzerinden
              kontrol edilmelidir.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-xl font-semibold text-cyan-300">
              4) Gizlilik ve Dosya Saklama
            </h2>
            <p>
              Varsayılan prensip: <b>Yüklenen dosyalar kalıcı olarak saklanmaz.</b>{" "}
              Analiz için geçici işleme yapılır. Detaylar Gizlilik Politikası’nda
              açıklanır.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-xl font-semibold text-cyan-300">
              5) Kullanıcı Yükümlülükleri
            </h2>
            <ul className="list-disc pl-6 space-y-1 text-gray-300">
              <li>Hizmet’i yürürlükteki mevzuata uygun kullanmak</li>
              <li>Üçüncü kişilere ait gizli/hassas veriler için gerekli izinleri almak</li>
              <li>Hesap güvenliğini sağlamak ve şifreyi korumak</li>
              <li>Yanıltıcı, yasa dışı veya hak ihlaline yol açacak içerik yüklememek</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-xl font-semibold text-cyan-300">
              6) Yasaklı Kullanımlar
            </h2>
            <ul className="list-disc pl-6 space-y-1 text-gray-300">
              <li>Sistemi kötüye kullanma, servis dışı bırakma girişimleri</li>
              <li>Yetkisiz erişim, tersine mühendislik, güvenlik testleri (izinsiz)</li>
              <li>Telif/kişilik haklarını ihlal eden içerik yükleme</li>
              <li>Hizmet’i yasa dışı amaçlarla kullanma</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-xl font-semibold text-cyan-300">
              7) Fikri Mülkiyet
            </h2>
            <p className="text-gray-300">
              Miron AI arayüzü, markaları, tasarım dili ve yazılım bileşenleri
              Miron Intelligence’a aittir. İzinsiz kopyalanamaz/çoğaltılamaz.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-xl font-semibold text-cyan-300">
              8) Sorumluluk Sınırı
            </h2>
            <p className="text-gray-300">
              Hizmet “olduğu gibi” sunulur. Dolaylı zararlar, veri kaybı, iş
              kaybı, kar kaybı gibi sonuçlardan Şirket sorumlu tutulamaz. Kullanıcı,
              çıktıları doğrulamakla yükümlüdür.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-xl font-semibold text-cyan-300">
              9) Hesabın Askıya Alınması / Fesih
            </h2>
            <p className="text-gray-300">
              Şirket, bu şartların ihlali halinde Hizmet’e erişimi geçici veya
              kalıcı olarak kısıtlayabilir.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-xl font-semibold text-cyan-300">
              10) Değişiklikler
            </h2>
            <p className="text-gray-300">
              Şartlar güncellenebilir. Güncel sürüm bu sayfada yayınlandığı anda
              yürürlüğe girer.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}