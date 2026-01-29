import React from "react";

export default function Privacy() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0b0b0c] to-[#17181b] text-gray-100">
      <div className="max-w-4xl mx-auto px-6 py-16">
        <h1 className="text-3xl md:text-4xl font-extrabold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
          Gizlilik Politikası
        </h1>
        <p className="text-sm text-gray-400 mt-2">Son Güncelleme: 22.12.2025</p>

        <div className="mt-8 space-y-6 text-gray-200 leading-relaxed">
          <section className="space-y-2">
            <h2 className="text-xl font-semibold text-cyan-300">1) Kapsam</h2>
            <p>
              Bu Gizlilik Politikası; Miron AI web uygulaması (“Hizmet”) üzerinden
              oluşturulan hesap bilgileri, kullanım verileri, geri bildirimler ve
              kullanıcının yüklediği belgeler dahil olmak üzere işlenen verilerin
              hangi amaçlarla işlendiğini açıklar.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-xl font-semibold text-cyan-300">
              2) Veri Sorumlusu / İletişim
            </h2>
            <p>
              Hizmetin sağlayıcısı: <b>Miron Intelligence</b> (“Şirket”). İletişim:
              <span className="text-gray-300"> mironintelligence@gmail.com</span>{" "}
              (veya uygulamada belirtilen güncel destek adresi).
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-xl font-semibold text-cyan-300">
              3) Hangi Veriler İşlenir?
            </h2>
            <ul className="list-disc pl-6 space-y-1 text-gray-300">
              <li>
                <b>Hesap verileri:</b> Ad, soyad, e-posta, rol ve benzeri temel
                kullanıcı bilgileri.
              </li>
              <li>
                <b>Geri bildirim verileri:</b> Kullanıcının yazdığı mesajlar, konu
                başlığı, teknik hata ekran görüntüsü vb. (kullanıcı eklerse).
              </li>
              <li>
                <b>Kullanım verileri:</b> Hata kayıtları (minimum seviyede),
                güvenlik olay kayıtları, performans ölçümleri.
              </li>
              <li>
                <b>Belge/veri içeriği:</b> Kullanıcının analiz için yüklediği
                belgelerin içeriği ve bu içerikten üretilen çıktı/özetler.
              </li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-xl font-semibold text-cyan-300">
              4) “Dosyalar Kaydedilmez” Taahhüdü (Varsayılan Çalışma)
            </h2>
            <p>
              Miron AI’nin varsayılan çalışma prensibi şudur:
              <b className="text-gray-100">
                {" "}
                Kullanıcının yüklediği dosyalar ve dosya içerikleri sunucularda
                kalıcı olarak saklanmaz.
              </b>{" "}
              Belge içeriği yalnızca analiz/işleme amacıyla <b>geçici</b> olarak
              işlenir ve işlem tamamlandıktan sonra sistem belleğinden temizlenmesi
              hedeflenir.
            </p>
            <p className="text-gray-300">
              Not: Hizmetin bazı özellikleri, talebin yerine getirilebilmesi için
              belge içeriğini üçüncü taraf yapay zekâ altyapısına iletebilir. Bu
              durumda aktarım yalnızca ilgili işlem için yapılır.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-xl font-semibold text-cyan-300">
              5) İşleme Amaçları
            </h2>
            <ul className="list-disc pl-6 space-y-1 text-gray-300">
              <li>Belge analizi, özetleme, sınıflandırma ve raporlama</li>
              <li>Miron Assistant üzerinden soru-cevap ve metin üretimi</li>
              <li>Hizmet güvenliği, hata ayıklama ve performans iyileştirme</li>
              <li>Kullanıcı destek süreçleri ve geri bildirimlerin yönetimi</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-xl font-semibold text-cyan-300">
              6) Üçüncü Taraflar ve Aktarım
            </h2>
            <p>
              Hizmet, yapay zekâ yanıtı üretebilmek için üçüncü taraf sağlayıcılar
              kullanabilir (ör. model servisleri). Bu durumda paylaşım yalnızca
              hizmetin çalışması için gereken minimum veriyle sınırlı tutulur.
            </p>
            <p className="text-gray-300">
              Kullanıcı, hassas veri içeren belgeleri yüklemeden önce gerekli
              hukuki yetkilendirmelere sahip olduğunu ve gerekli aydınlatma/izin
              süreçlerini yürüttüğünü kabul eder.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-xl font-semibold text-cyan-300">
              7) Güvenlik
            </h2>
            <ul className="list-disc pl-6 space-y-1 text-gray-300">
              <li>İletişim şifrelemesi (TLS/HTTPS)</li>
              <li>Yetkisiz erişime karşı erişim kontrolleri</li>
              <li>Minimum log prensibi (gereksiz içerik loglanmaz)</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-xl font-semibold text-cyan-300">
              8) Saklama Süreleri
            </h2>
            <p>
              <b>Belge içerikleri:</b> Varsayılan olarak kalıcı saklanmaz.
            </p>
            <p className="text-gray-300">
              <b>Hesap verileri:</b> Hesap aktif olduğu sürece; yasal
              yükümlülükler saklama gerektiriyorsa ilgili süre kadar.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-xl font-semibold text-cyan-300">
              9) KVKK Kapsamında Haklar
            </h2>
            <p className="text-gray-300">
              6698 sayılı KVKK kapsamında; veri işlenip işlenmediğini öğrenme,
              bilgi talep etme, düzeltilmesini/silinmesini isteme ve ilgili diğer
              haklarınızı kullanmak için destek kanalından bize ulaşabilirsiniz.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-xl font-semibold text-cyan-300">
              10) Değişiklikler
            </h2>
            <p className="text-gray-300">
              Bu politika güncellenebilir. Güncel sürüm bu sayfada yayınlanır.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}