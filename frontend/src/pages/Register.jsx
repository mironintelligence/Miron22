import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../auth/AuthProvider";

/**
 * Register.jsx
 * - mode: "single" | "multi"
 * - her kişi için: firstName, lastName, email, password (zorunlu)
 * - çoklu modda uyarı görünür: "aynı şifreyi kullanmayın"
 * - 3 doküman modalı + 3 onay kutusu (zorunlu)
 * - Kaydı Tamamla butonu yalnızca tüm zorunlu alanlar + 3 onay işaretlenince aktif
 */

function duplicatePasswordsExist(persons) {
  const pw = persons.map((p) => (p.password || "").trim()).filter(Boolean);
  const set = new Set(pw);
  return pw.length !== set.size;
}

export default function Register() {
  const navigate = useNavigate();
  const { register } = useAuth();

  const [mode, setMode] = useState("single"); // single | multi
  const [city, setCity] = useState("");
  const [firm, setFirm] = useState("");

  // single user fields
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState(""); // ✅ e-posta eklendi
  const [password, setPassword] = useState("");

  // multi user
  const [personCount, setPersonCount] = useState(2);
  const [persons, setPersons] = useState([
    { firstName: "", lastName: "", email: "", password: "" }, // ✅
    { firstName: "", lastName: "", email: "", password: "" }, // ✅
  ]);

  // docs modal
  const [termsOpen, setTermsOpen] = useState(false);
  const [activeDoc, setActiveDoc] = useState("agreement"); // agreement | privacy | terms

  // accept checkboxes
  const [acceptedAgreement, setAcceptedAgreement] = useState(false);
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submitSuccess, setSubmitSuccess] = useState("");
  
  // Pricing state
  const [pricingData, setPricingData] = useState(null);

  useEffect(() => {
    async function fetchPrice() {
      try {
        const count = mode === "single" ? 1 : personCount;
        const base = import.meta.env.VITE_API_URL || "https://miron22.onrender.com";
        const res = await fetch(`${base}/api/pricing/calculate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ count }),
        });
        if (res.ok) {
          const data = await res.json();
          setPricingData(data);
        }
      } catch (e) {
        console.error("Price fetch error", e);
      }
    }
    fetchPrice();
  }, [mode, personCount]);

  const openDoc = (type) => {
    setActiveDoc(type);
    setTermsOpen(true);
  };

  useEffect(() => {
    // ensure persons array length matches personCount
    setPersons((prev) => {
      const next = [...prev];
      if (personCount > next.length) {
        for (let i = next.length; i < personCount; i++) {
          next.push({ firstName: "", lastName: "", email: "", password: "" }); // ✅
        }
      } else if (personCount < next.length) {
        next.length = personCount;
      }
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [personCount]);

  const isValidEmail = (value) => {
    const v = String(value || "").trim();
    if (!v) return false;
    return /\S+@\S+\.\S+/.test(v);
  };

  const validSingle = useMemo(() => {
    return (
      firstName.trim().length > 0 &&
      lastName.trim().length > 0 &&
      isValidEmail(email) &&
      password.trim().length >= 8
    );
  }, [firstName, lastName, email, password]);

  const validMulti = useMemo(() => {
    return (
      firstName.trim().length > 0 &&
      lastName.trim().length > 0 &&
      email.trim().length > 0 &&
      password.trim().length >= 8 &&
      personCount >= 3
    );
  }, [firstName, lastName, email, password, personCount]);

  const acceptedAll = acceptedAgreement && acceptedPrivacy && acceptedTerms;
  const disabled = mode === "single" ? !validSingle || !acceptedAll : !validMulti || !acceptedAll;

  const updatePerson = (idx, key, value) => {
    setPersons((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], [key]: value };
      return next;
    });
  };

  const onCountChange = (n) => {
    const count = Number(n);
    setPersonCount(count);
  };

  const handleSubmit = async () => {
    if (submitting || disabled) return;
    setSubmitError("");
    setSubmitSuccess("");
    setSubmitting(true);

    const payload =
      mode === "single"
        ? {
            mode,
            count: 1,
            city,
            firm: firm || "",
            persons: [
              {
                firstName: firstName.trim(),
                lastName: lastName.trim(),
                email: email.trim(), // ✅
                password: password,
              },
            ],
          }
        : {
            mode,
            count: personCount,
            city,
            firm: firm || "",
            persons: persons.map((p) => ({
              firstName: p.firstName.trim(),
              lastName: p.lastName.trim(),
              email: (p.email || "").trim(), // ✅
              password: p.password,
            })),
          };

    try {
      const list = payload.persons || [];
      let verificationNeeded = false;
      
      for (const p of list) {
        const res = await register({
          email: p.email,
          password: p.password,
          firstName: p.firstName,
          lastName: p.lastName,
          mode,
        });
        if (res && res.requires_verification) {
          verificationNeeded = true;
        }
      }
      setSubmitSuccess("Kayıt başarılı.");
      navigate("/pricing", { state: { ...payload, verificationNeeded } });
    } catch (e) {
      setSubmitError(e?.message || "Kayıt başarısız.");
    } finally {
      setSubmitting(false);
    }
  };

  const duplicatePw = mode === "multi" && duplicatePasswordsExist(persons);

  const docTitle =
    activeDoc === "agreement"
      ? "KULLANICI SÖZLEŞMESİ"
      : activeDoc === "privacy"
      ? "GİZLİLİK POLİTİKASI"
      : "KULLANIM ŞARTLARI";

  const DocContent = () => {
    if (activeDoc === "agreement") {
      return (
        <>
          <h3>1) Taraflar ve Konu</h3>
          <p>
            İşbu sözleşme, Miron Intelligence (“Şirket”) ile Miron AI’yi kullanan gerçek/tüzel kişi (“Kullanıcı”) arasında,
            Hizmet’in kullanım koşullarını düzenler.
          </p>

          <h3>2) Hizmetin Niteliği</h3>
          <p className="text-gray-300">
            Miron AI, hukuk profesyonellerine yönelik üretken yapay zekâ fonksiyonları sağlar. Üretilen çıktılar rehber
            niteliktedir; nihai sorumluluk kullanıcıdadır.
          </p>

          <h3>3) Gizlilik ve Dosya İşleme</h3>
          <p>
            Kullanıcı, belge yüklediğinde belgenin içerik olarak analiz için işlenmesine izin verdiğini kabul eder. Varsayılan
            prensip:
            <b className="text-gray-100"> Dosyalar ve dosya içerikleri kalıcı olarak saklanmaz.</b> İşleme tamamlandıktan
            sonra bellekten temizleme hedeflenir.
          </p>

          <h3>4) Kullanıcının Beyan ve Taahhütleri</h3>
          <ul className="list-disc pl-6 space-y-1 text-gray-300">
            <li>Yüklediği içerik üzerinde gerekli hak/izinlere sahip olduğunu</li>
            <li>Gizli bilgileri, müvekkil verilerini ve kişisel verileri hukuka uygun işlediğini</li>
            <li>Çıktıları kontrol edip doğrulayacağını</li>
          </ul>

          <h3>5) Ücretlendirme / Paketler</h3>
          <p className="text-gray-300">
            Ücretlendirme, paketler ve deneme süreleri arayüzde veya satış kanallarında ayrıca belirtilebilir. (Ödeme altyapısı
            aktif edildiğinde bu bölüm genişletilir.)
          </p>

          <h3>6) Yürürlük ve Fesih</h3>
          <p className="text-gray-300">
            Kullanıcı bu sözleşmeyi onaylayarak yürürlüğe sokar. Şirket, ağır ihlal durumunda erişimi askıya alabilir/sonlandırabilir.
          </p>

          <h3>7) Uyuşmazlık ve Yetki</h3>
          <p className="text-gray-300">
            Uyuşmazlıklarda Türkiye Cumhuriyeti hukuku uygulanır. Yetkili mahkeme/mercii, Şirket’in merkezinin bulunduğu yer esas
            alınarak belirlenebilir (güncel adres/merkez bilgisi ayrıca duyurulur).
          </p>
        </>
      );
    }

    if (activeDoc === "privacy") {
      return (
        <>
          <h3>1) Kapsam</h3>
          <p>
            Bu Gizlilik Politikası; Miron AI web uygulaması (“Hizmet”) üzerinden oluşturulan hesap bilgileri, kullanım verileri,
            geri bildirimler ve kullanıcının yüklediği belgeler dahil olmak üzere işlenen verilerin hangi amaçlarla işlendiğini açıklar.
          </p>

          <h3>2) Veri Sorumlusu / İletişim</h3>
          <p>
            Hizmetin sağlayıcısı: <b>Miron Intelligence</b> (“Şirket”). İletişim:
            <span className="text-gray-300"> mironintelligenceqgmail.com</span> (veya uygulamada belirtilen güncel destek adresi).
          </p>

          <h3>3) Hangi Veriler İşlenir?</h3>
          <ul className="list-disc pl-6 space-y-1 text-gray-300">
            <li>
              <b>Hesap verileri:</b> Ad, soyad, e-posta, rol ve benzeri temel kullanıcı bilgileri.
            </li>
            <li>
              <b>Geri bildirim verileri:</b> Kullanıcının yazdığı mesajlar, konu başlığı, teknik hata ekran görüntüsü vb. (kullanıcı eklerse).
            </li>
            <li>
              <b>Kullanım verileri:</b> Hata kayıtları (minimum seviyede), güvenlik olay kayıtları, performans ölçümleri.
            </li>
            <li>
              <b>Belge/veri içeriği:</b> Kullanıcının analiz için yüklediği belgelerin içeriği ve bu içerikten üretilen çıktı/özetler.
            </li>
          </ul>

          <h3>4) “Dosyalar Kaydedilmez” Taahhüdü (Varsayılan Çalışma)</h3>
          <p>
            Miron AI’nin varsayılan çalışma prensibi şudur:
            <b className="text-gray-100"> Kullanıcının yüklediği dosyalar ve dosya içerikleri sunucularda kalıcı olarak saklanmaz.</b>
            Belge içeriği yalnızca analiz/işleme amacıyla <b>geçici</b> olarak işlenir ve işlem tamamlandıktan sonra sistem belleğinden
            temizlenmesi hedeflenir.
          </p>
          <p className="text-gray-300">
            Not: Hizmetin bazı özellikleri, talebin yerine getirilebilmesi için belge içeriğini üçüncü taraf yapay zekâ altyapısına iletebilir.
            Bu durumda aktarım yalnızca ilgili işlem için yapılır.
          </p>

          <h3>5) İşleme Amaçları</h3>
          <ul className="list-disc pl-6 space-y-1 text-gray-300">
            <li>Belge analizi, özetleme, sınıflandırma ve raporlama</li>
            <li>KRM Assistant üzerinden soru-cevap ve metin üretimi</li>
            <li>Hizmet güvenliği, hata ayıklama ve performans iyileştirme</li>
            <li>Kullanıcı destek süreçleri ve geri bildirimlerin yönetimi</li>
          </ul>

          <h3>6) Üçüncü Taraflar ve Aktarım</h3>
          <p>
            Hizmet, yapay zekâ yanıtı üretebilmek için üçüncü taraf sağlayıcılar kullanabilir (ör. model servisleri). Bu durumda paylaşım yalnızca
            hizmetin çalışması için gereken minimum veriyle sınırlı tutulur.
          </p>
          <p className="text-gray-300">
            Kullanıcı, hassas veri içeren belgeleri yüklemeden önce gerekli hukuki yetkilendirmelere sahip olduğunu ve gerekli aydınlatma/izin süreçlerini
            yürüttüğünü kabul eder.
          </p>

          <h3>7) Güvenlik</h3>
          <ul className="list-disc pl-6 space-y-1 text-gray-300">
            <li>İletişim şifrelemesi (TLS/HTTPS)</li>
            <li>Yetkisiz erişime karşı erişim kontrolleri</li>
            <li>Minimum log prensibi (gereksiz içerik loglanmaz)</li>
          </ul>

          <h3>8) Saklama Süreleri</h3>
          <p>
            <b>Belge içerikleri:</b> Varsayılan olarak kalıcı saklanmaz.
          </p>
          <p className="text-gray-300">
            <b>Hesap verileri:</b> Hesap aktif olduğu sürece; yasal yükümlülükler saklama gerektiriyorsa ilgili süre kadar.
          </p>

          <h3>9) KVKK Kapsamında Haklar</h3>
          <p className="text-gray-300">
            6698 sayılı KVKK kapsamında; veri işlenip işlenmediğini öğrenme, bilgi talep etme, düzeltilmesini/silinmesini isteme ve ilgili diğer haklarınızı
            kullanmak için destek kanalından bize ulaşabilirsiniz.
          </p>

          <h3>10) Değişiklikler</h3>
          <p className="text-gray-300">Bu politika güncellenebilir. Güncel sürüm bu sayfada yayınlanır.</p>
        </>
      );
    }

    return (
      <>
        <h3>1) Kabul ve Kapsam</h3>
        <p>
          Miron AI’ye erişerek ve/veya hesap oluşturarak bu Kullanım Şartları’nı kabul etmiş olursunuz. Kabul etmiyorsanız Hizmet’i kullanmayınız.
        </p>

        <h3>2) Hizmet Tanımı</h3>
        <p>
          Miron AI; belge analizi, özetleme, metin üretimi ve KRM Assistant üzerinden soru-cevap gibi yapay zekâ destekli araçlar sağlar.
        </p>

        <h3>3) Hukuki Uyarı (Çok Net)</h3>
        <p>
          Miron AI’nin çıktıları <b>hukuki danışmanlık değildir</b>. Nihai değerlendirme ve sorumluluk kullanıcıya (avukata/hukuk profesyoneline) aittir.
          Miron AI tarafından üretilen içerikler hatalı/eksik olabilir; her zaman kaynak mevzuat ve içtihat üzerinden kontrol edilmelidir.
        </p>

        <h3>4) Gizlilik ve Dosya Saklama</h3>
        <p>
          Varsayılan prensip: <b>Yüklenen dosyalar kalıcı olarak saklanmaz.</b> Analiz için geçici işleme yapılır. Detaylar Gizlilik Politikası’nda açıklanır.
        </p>

        <h3>5) Kullanıcı Yükümlülükleri</h3>
        <ul className="list-disc pl-6 space-y-1 text-gray-300">
          <li>Hizmet’i yürürlükteki mevzuata uygun kullanmak</li>
          <li>Üçüncü kişilere ait gizli/hassas veriler için gerekli izinleri almak</li>
          <li>Hesap güvenliğini sağlamak ve şifreyi korumak</li>
          <li>Yanıltıcı, yasa dışı veya hak ihlaline yol açacak içerik yüklememek</li>
        </ul>

        <h3>6) Yasaklı Kullanımlar</h3>
        <ul className="list-disc pl-6 space-y-1 text-gray-300">
          <li>Sistemi kötüye kullanma, servis dışı bırakma girişimleri</li>
          <li>Yetkisiz erişim, tersine mühendislik, güvenlik testleri (izinsiz)</li>
          <li>Telif/kişilik haklarını ihlal eden içerik yükleme</li>
          <li>Hizmet’i yasa dışı amaçlarla kullanma</li>
        </ul>

        <h3>7) Fikri Mülkiyet</h3>
        <p className="text-gray-300">
          Miron AI arayüzü, markaları, tasarım dili ve yazılım bileşenleri Miron Intelligence’a aittir. İzinsiz kopyalanamaz/çoğaltılamaz.
        </p>

        <h3>8) Sorumluluk Sınırı</h3>
        <p className="text-gray-300">
          Hizmet “olduğu gibi” sunulur. Dolaylı zararlar, veri kaybı, iş kaybı, kar kaybı gibi sonuçlardan Şirket sorumlu tutulamaz. Kullanıcı, çıktıları
          doğrulamakla yükümlüdür.
        </p>

        <h3>9) Hesabın Askıya Alınması / Fesih</h3>
        <p className="text-gray-300">
          Şirket, bu şartların ihlali halinde Hizmet’e erişimi geçici veya kalıcı olarak kısıtlayabilir.
        </p>

        <h3>10) Değişiklikler</h3>
        <p className="text-gray-300">
          Şartlar güncellenebilir. Güncel sürüm bu sayfada yayınlandığı anda yürürlüğe girer.
        </p>
      </>
    );
  };

  return (
    <div className="min-h-screen mt-12 px-6 sm:px-10 md:px-16 pb-12">
      <div className="glass p-6 sm:p-8 rounded-2xl">
        <div className="text-center mb-6">
          <h2 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
            Miron AI – Legal Intelligence Suite
          </h2>
          <p className="text-sm text-gray-400 mt-1">
            Türkiye’nin en akıllı hukuk otomasyon platformuna erişim için bilgilerinizi girin.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-1 glass p-4 rounded-xl">
            <div className="font-semibold mb-2">Kayıt Tipi</div>
            <label className="flex items-center gap-2">
              <input type="radio" name="mode" checked={mode === "single"} onChange={() => setMode("single")} />
              <span>Şahıs (tek kullanıcı)</span>
            </label>
            <label className="flex items-center gap-2 mt-2">
              <input type="radio" name="mode" checked={mode === "multi"} onChange={() => setMode("multi")} />
              <span>Çok kişili ofis</span>
            </label>

            <div className="mt-4">
              <div className="text-sm mb-1">Şehir (opsiyonel)</div>
              <input
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="İstanbul"
                className="w-full px-3 py-2 rounded-xl bg-white/10 border border-white/20"
              />
            </div>

            <div className="mt-3">
              <div className="text-sm mb-1">Hukuk Bürosu (opsiyonel)</div>
              <input
                value={firm}
                onChange={(e) => setFirm(e.target.value)}
                placeholder="Miron Hukuk"
                className="w-full px-3 py-2 rounded-xl bg-white/10 border border-white/20"
              />
            </div>
          </div>

          <div className="md:col-span-2 glass p-4 rounded-xl">
            {mode === "single" ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <div className="text-sm mb-1">
                    Ad <span className="text-red-400">*</span>
                  </div>
                  <input
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white/10 border border-white/20"
                  />
                </div>

                <div>
                  <div className="text-sm mb-1">
                    Soyad <span className="text-red-400">*</span>
                  </div>
                  <input
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white/10 border border-white/20"
                  />
                </div>

                {/* ✅ E-POSTA EKLENDİ (görünüş aynı) */}
                <div className="sm:col-span-2">
                  <div className="text-sm mb-1">
                    E-posta <span className="text-red-400">*</span>
                  </div>
                  <input
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="ornek@domain.com"
                    className="w-full px-3 py-2 rounded-xl bg-white/10 border border-white/20"
                  />
                </div>

                <div className="sm:col-span-2 mt-2">
                  <div className="text-sm mb-1">
                    Şifre <span className="text-red-400">*</span>
                  </div>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
        placeholder="En az 8 karakter"
                    className="w-full px-3 py-2 rounded-xl bg-white/10 border border-white/20"
                  />
                  <div className="text-[12px] mt-2 text-gray-400">
                    Güvenlik için güçlü bir şifre seçin. Aynı şifreyi başka kullanıcılarla paylaşmayın.
                  </div>
                </div>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <div className="text-sm mb-1">Kişi Sayısı</div>
                    <select
                      value={personCount}
                      onChange={(e) => onCountChange(Number(e.target.value))}
                      className="w-full px-3 py-2 pr-10 rounded-xl border border-white/10 text-white font-medium
                                bg-gradient-to-br from-[#0b0b0c]/80 to-[#17181b]/80 backdrop-blur-md shadow-inner
                                focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400 outline-none transition-all
                                 hover:scale-[1.01]"
                      style={{
                        appearance: "none",
                        WebkitAppearance: "none",
                        MozAppearance: "none",
                        color: "#e3e3e3",
                        backgroundImage:
                          "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'><path fill='%2322d3ee' d='M7 10l5 5 5-5z'/></svg>\")",
                        backgroundRepeat: "no-repeat",
                        backgroundPosition: "right 10px center",
                        backgroundSize: "16px 16px",
                      }}
                    >
                      {Array.from({ length: 199 }).map((_, i) => {
                        const n = i + 2; // 2..200
                        return (
                          <option key={n} value={n} className="bg-[#0b0b0c] text-white">
                            {n}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                </div>

                {/* Çok kişili uyarı (görünür yerde) */}
                <div className="mt-4 p-3 rounded-xl border border-red-400/30 bg-red-500/5 text-sm text-red-600">
                  ⚠️ Lütfen aynı şifreyi birden fazla kişiyle paylaşmayın. Her kullanıcı kendi şifresini belirlemelidir.
                  Aksi durumda güvenlik riski oluşur.
                </div>

                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {persons.map((p, idx) => (
                    <div key={idx} className="glass p-3 rounded-xl">
                      <div className="text-xs opacity-70 mb-2">Kişi {idx + 1}</div>

                      <input
                        value={p.firstName}
                        onChange={(e) => updatePerson(idx, "firstName", e.target.value)}
                        placeholder="Ad *"
                        className="w-full px-3 py-2 rounded-xl bg-white/10 border border-white/20 mb-2"
                      />

                      <input
                        value={p.lastName}
                        onChange={(e) => updatePerson(idx, "lastName", e.target.value)}
                        placeholder="Soyad *"
                        className="w-full px-3 py-2 rounded-xl bg-white/10 border border-white/20 mb-2"
                      />

                      {/* ✅ E-POSTA EKLENDİ (görünüş aynı) */}
                      <input
                        value={p.email}
                        onChange={(e) => updatePerson(idx, "email", e.target.value)}
                        placeholder="E-posta *"
                        className="w-full px-3 py-2 rounded-xl bg-white/10 border border-white/20 mb-2"
                      />

                      <input
                        type="password"
                        value={p.password}
                        onChange={(e) => updatePerson(idx, "password", e.target.value)}
                        placeholder="Şifre * (en az 8 karakter)"
                        className="w-full px-3 py-2 rounded-xl bg-white/10 border border-white/20"
                      />
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* Pricing Summary */}
            {pricingData && (
              <div className="mt-6 p-4 rounded-xl bg-gradient-to-r from-blue-900/20 to-cyan-900/20 border border-blue-500/30">
                 <div className="flex justify-between items-center text-sm mb-1">
                    <span className="text-gray-300">Kişi Sayısı:</span>
                    <span className="text-white font-medium">{pricingData.count}</span>
                 </div>
                 {pricingData.is_discounted && (
                   <div className="flex justify-between items-center text-sm mb-1 text-green-400">
                      <span>Toplu İndirim (%{pricingData.applied_discount_rate}):</span>
                      <span>-{pricingData.discount_amount.toLocaleString("tr-TR")} TL</span>
                   </div>
                 )}
                 <div className="flex justify-between items-center mt-2 pt-2 border-t border-white/10">
                    <span className="text-gray-200 font-semibold">Toplam Tutar:</span>
                    <div className="text-right">
                       {pricingData.is_discounted && (
                          <span className="text-xs text-gray-500 line-through mr-2">
                            {pricingData.raw_total.toLocaleString("tr-TR")} TL
                          </span>
                       )}
                       <span className="text-xl font-bold text-cyan-400">
                          {pricingData.final_total.toLocaleString("tr-TR")} TL
                       </span>
                    </div>
                 </div>
              </div>
            )}

            {/* Sözleşme onayı ve uyarılar */}
            <div className="mt-6 flex flex-col gap-3">
              <label className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={acceptedAgreement}
                  onChange={(e) => setAcceptedAgreement(e.target.checked)}
                />
                <div className="text-sm">
                  <span
                    className="font-medium cursor-pointer text-cyan-400 underline"
                    onClick={() => openDoc("agreement")}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => e.key === "Enter" && openDoc("agreement")}
                  >
                    Kullanıcı Sözleşmesi
                  </span>{" "}
                  <span className="font-medium">okudum ve kabul ediyorum.</span>
                </div>
              </label>

              <label className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={acceptedPrivacy}
                  onChange={(e) => setAcceptedPrivacy(e.target.checked)}
                />
                <div className="text-sm">
                  <span
                    className="font-medium cursor-pointer text-cyan-400 underline"
                    onClick={() => openDoc("privacy")}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => e.key === "Enter" && openDoc("privacy")}
                  >
                    Gizlilik Politikası
                  </span>{" "}
                  <span className="font-medium">okudum ve kabul ediyorum.</span>
                </div>
              </label>

              <label className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={acceptedTerms}
                  onChange={(e) => setAcceptedTerms(e.target.checked)}
                />
                <div className="text-sm">
                  <span
                    className="font-medium cursor-pointer text-cyan-400 underline"
                    onClick={() => openDoc("terms")}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => e.key === "Enter" && openDoc("terms")}
                  >
                    Kullanım Şartları
                  </span>{" "}
                  <span className="font-medium">okudum ve kabul ediyorum.</span>
                </div>
              </label>

              {mode === "multi" && duplicatePw && (
                <div className="p-3 rounded-xl border border-yellow-400/30 bg-yellow-500/5 text-sm text-yellow-600">
                  ⚠️ Uyarı: Kayıt edilen kişiler arasında aynı şifre tespit edildi. Her kullanıcı için benzersiz bir şifre
                  belirleyin.
                </div>
              )}

              <div className="flex flex-col gap-3 items-end">
                {submitError && (
                  <div className="w-full p-3 rounded-xl border border-red-400/30 bg-red-500/10 text-sm text-red-200">
                    {submitError}
                  </div>
                )}
                {submitSuccess && (
                  <div className="w-full p-3 rounded-xl border border-green-400/30 bg-green-500/10 text-sm text-green-200">
                    {submitSuccess}
                  </div>
                )}
                <button
                  onClick={handleSubmit}
                  disabled={disabled || submitting}
                  className="px-6 py-3 rounded-xl font-semibold text-white shadow
                           bg-gradient-to-r from-cyan-500 to-blue-500 hover:opacity-95 transition
                           disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? "Kayıt gönderiliyor..." : "Kaydı Tamamla"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Docs modal */}
      <AnimatePresence>
        {termsOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
          >
            <motion.div
              initial={{ y: 12 }}
              animate={{ y: 0 }}
              exit={{ y: 12 }}
              className="w-full max-w-3xl bg-white/95 dark:bg-gray-900/95 rounded-2xl shadow-2xl overflow-auto max-h-[85vh]"
            >
              <div className="p-4 border-b border-white/10">
                <div className="text-sm font-semibold text-white bg-cyan-500 px-3 py-2 rounded-md inline-block">
                  {docTitle}
                </div>
                <button onClick={() => setTermsOpen(false)} className="float-right text-sm px-3 py-1">
                  Kapat
                </button>
              </div>

              <div className="p-6 prose prose-invert text-sm">
                <DocContent />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <footer className="mt-8 mb-6 text-center text-xs text-gray-500">
        ©️ 2025 Miron Intelligence — All Rights Reserved
      </footer>
    </div>
  );
}
