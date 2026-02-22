import { Link } from "react-router-dom";

export default function Landing() {
  return (
    <div className="min-h-screen px-6 sm:px-10 md:px-16 py-16">
      <header className="flex items-center justify-between mb-12">
        <div className="text-xl font-bold text-accent">Miron AI — Legal Intelligence Suite</div>
        <div className="flex gap-3">
          <Link to="/login" className="px-4 py-2 rounded-lg glass hover:bg-white/10">Giriş Yap</Link>
          <Link to="/register" className="px-4 py-2 rounded-lg btn-primary">
            Kayıt Ol
          </Link>
        </div>
      </header>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
        <div>
          <h1 className="text-3xl sm:text-4xl font-extrabold mb-4">
            Avukatlar için <span className="text-accent">tam entegre</span> yapay zekâ asistanı
          </h1>
          <p className="text-muted mb-6">
            Evrak analizi, emsal karar taraması, dilekçe oluşturma ve stratejik risk analizi.
            Avukat odaklı tek panel deneyimi.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link to="/demo-request" className="px-5 py-2 rounded-lg btn-primary">
              Demo İste
            </Link>
            <Link to="/login" className="px-5 py-2 rounded-lg glass hover:bg-white/10">
              Hemen Giriş Yap
            </Link>
          </div>
          <p className="text-xs text-subtle mt-3">Demo taleplerine 24 saat içinde dönüş yapılır.</p>
        </div>

        <div className="glass p-6 rounded-2xl">
          <h3 className="text-lg font-semibold mb-3">Öne Çıkan Modüller</h3>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-white">
            <li className="glass p-3 rounded-xl">📂 Evrak Analizi</li>
            <li className="glass p-3 rounded-xl">🧾 Dilekçe Oluşturucu</li>
            <li className="glass p-3 rounded-xl">💬 Akıllı Asistan</li>
            <li className="glass p-3 rounded-xl">🔒 KVKK Maskeleme</li>
            <li className="glass p-3 rounded-xl">📊 Raporlama & Olasılık</li>
          </ul>
          <div className="mt-5 text-xs text-subtle">
            Premium deneyim: animasyonlar, cam efektli modern arayüz, hızlı raporlar.
          </div>
        </div>
      </section>

      <section className="mt-16 grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="glass p-6 rounded-2xl">
          <div className="text-sm text-subtle">Güvenlik & Uyumluluk</div>
          <h3 className="text-xl font-semibold mt-2">KVKK odaklı iş akışı</h3>
          <p className="text-sm text-muted mt-3">
            Maskeleme, erişim kontrolü ve güvenli veri akışı ile hassas dosyaları güvenle yönetin.
          </p>
        </div>
        <div className="glass p-6 rounded-2xl">
          <div className="text-sm text-subtle">Hızlı Üretkenlik</div>
          <h3 className="text-xl font-semibold mt-2">Dakikalar içinde sonuç</h3>
          <p className="text-sm text-muted mt-3">
            Dava özetleri, risk analizleri ve dilekçe taslakları tek oturumda hazır.
          </p>
        </div>
        <div className="glass p-6 rounded-2xl">
          <div className="text-sm text-subtle">Kurumsal Seviye</div>
          <h3 className="text-xl font-semibold mt-2">Takım ve raporlama</h3>
          <p className="text-sm text-muted mt-3">
            Panelde ekip görünürlüğü, performans raporları ve strateji özetleri.
          </p>
        </div>
      </section>

      <section className="mt-16 glass p-8 rounded-3xl">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div>
            <h2 className="text-2xl font-semibold">Akıllı iş akışı</h2>
            <p className="text-sm text-muted mt-2">
              Dosyayı yükle, analiz al, strateji üret ve çıktıyı ekip içinde paylaş.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <span className="px-3 py-1 rounded-full glass text-xs text-subtle">1. Dosya Yükle</span>
            <span className="px-3 py-1 rounded-full glass text-xs text-subtle">2. Analiz Et</span>
            <span className="px-3 py-1 rounded-full glass text-xs text-subtle">3. Strateji Çıkar</span>
            <span className="px-3 py-1 rounded-full glass text-xs text-subtle">4. Paylaş</span>
          </div>
        </div>
      </section>
    </div>
  );
}
