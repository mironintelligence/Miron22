import { Link } from "react-router-dom";

export default function Landing() {
  return (
    <div className="min-h-screen px-6 sm:px-10 md:px-16 py-16">
      <header className="flex items-center justify-between mb-12">
        <div className="text-xl font-bold bg-gradient-to-r from-cyan-400 to-green-400 bg-clip-text text-transparent">
          Libra AI — Legal Intelligence Suite
        </div>
        <div className="flex gap-3">
          <Link to="/login" className="px-4 py-2 rounded-lg glass hover:bg-white/10">Giriş Yap</Link>
          <Link to="/register" className="px-4 py-2 rounded-lg bg-gradient-to-r from-cyan-500 to-green-600 hover:opacity-90">
            Kayıt Ol
          </Link>
        </div>
      </header>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
        <div>
          <h1 className="text-3xl sm:text-4xl font-extrabold mb-4">
            Avukatlar için <span className="text-cyan-400">tam entegre</span> yapay zekâ asistanı
          </h1>
          <p className="text-gray-300 mb-6">
            Evrak analizi, KVKK maskeleme, emsal karar özetleri, dilekçe oluşturma ve
            Libra Assistant ile dava bazlı soru-cevap… Hepsi tek panelde.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link to="/demo-request" className="px-5 py-2 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 hover:opacity-90">
              Demo İste
            </Link>
            <Link to="/login" className="px-5 py-2 rounded-lg glass hover:bg-white/10">
              Hemen Giriş Yap
            </Link>
          </div>
          <p className="text-xs text-gray-400 mt-3">Demo taleplerine 24 saat içinde dönüş yapılır.</p>
        </div>

        <div className="glass p-6 rounded-2xl">
          <h3 className="text-lg font-semibold mb-3">Öne Çıkan Modüller</h3>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-gray-200">
            <li className="glass p-3 rounded-xl">📂 Evrak Analizi</li>
            <li className="glass p-3 rounded-xl">🧾 Dilekçe Oluşturucu</li>
            <li className="glass p-3 rounded-xl">💬 Libra Assistant</li>
            <li className="glass p-3 rounded-xl">☁️ Libra Cloud</li>
            <li className="glass p-3 rounded-xl">🔒 KVKK Maskeleme</li>
            <li className="glass p-3 rounded-xl">📊 Raporlama & Olasılık</li>
          </ul>
          <div className="mt-5 text-xs text-gray-400">
            Premium deneyim: animasyonlar, cam efektli modern arayüz, hızlı raporlar.
          </div>
        </div>
      </section>
    </div>
  );
}
