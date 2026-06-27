# Gizlilik Politikası

**Son güncelleme: Haziran 2026**

---

## 1. Veri Sorumlusu

Bu Gizlilik Politikası, Türk avukatlara ve hukuk profesyonellerine yönelik yapay zeka destekli hukuk otomasyon platformu işleten **Miron GROUP LLC** ("Şirket", "Miron AI", "biz") tarafından hazırlanmıştır.

Platform, niteliği itibarıyla müvekkil bilgileri ve gizli hukuki belgeler içerebilen içeriklerle çalışır. Bu nedenle veri işleme süreçlerimiz **minimizasyon** (yalnızca gerekeni topla), **geçicilik** (belge içeriğini kalıcı tutma) ve **şeffaflık** (ne yaptığımızı açıkça anlat) ilkeleri üzerine inşa edilmiştir.

**Adres:** 30 N Gould St Ste R, Sheridan, WY 82801, USA
**EIN (ABD Vergi No):** 38-4399031
**Tescil:** Wyoming Secretary of State, No: 2026-001979488
**İletişim:** mironintelligence@gmail.com
**KVKK başvuruları:** kvkk@mironintelligence.com

---

## 2. Topladığımız Veriler ve Neden

### 2.1 Hesap Verileri (Zorunlu, Kalıcı)

Kayıt sırasında toplanan: ad, soyad, e-posta adresi, seçilen abonelik planı, fatura bilgileri, hesap oluşturma tarihi ve son giriş tarihi.

Bu veriler hesabınızı yönetmek, aboneliği işlemek ve yasal yükümlülüklerimizi yerine getirmek için zorunludur. **Baro numarası hiçbir koşulda istenmez ve toplanmaz.**

### 2.2 Teknik ve Güvenlik Verileri (Sınırlı Süre)

Giriş IP adresi, oturum tanımlayıcısı, cihaz/tarayıcı türü, başarısız giriş denemeleri ve güvenlik olayı logları — dolandırıcılık önleme ve hesap güvenliği amacıyla **90 gün** saklanır, ardından otomatik olarak kalıcı biçimde silinir.

### 2.3 Belge ve İşlem İçeriği (Geçici veya Anonim)

Platforma yüklediğiniz veya işleme gönderdiğiniz belgeler, dava dosyaları, sözleşmeler ve metin içerikleri iki farklı senaryoda işlenir:

**Senaryo A — Onay Verilmezse (Varsayılan):**

İşlem içeriği yalnızca ilgili API isteğinin süresiyle sınırlı olarak sunucu belleğinde (RAM) tutulur. İstek tamamlandığı anda içerik tamamen bellekten silinir. Hiçbir veritabanı kaydı, dosya, log veya yedek oluşturulmaz. Veri yoktur, dolayısıyla silinecek bir şey de yoktur.

**Senaryo B — Kullanıcı Onay Verirse:**

İçerik işlenmeden önce TC kimlik numaraları, müvekkil/karşı taraf isimleri, adres bilgileri ve kişiyi ya da davayı tanımlamaya yarayabilecek tüm tanımlayıcılar algoritmik olarak tespit edilip kaldırılır (tam anonimleştirme). Kaldırılmış içerik, AI sistemini iyileştirmek amacıyla **anonim veri olarak** kaydedilir ve kullanılır.

Bu onay dilediğiniz zaman Ayarlar sayfasından geri alınabilir. Geri alım anından itibaren yeni içerik kaydedilmez; önceden kaydedilmiş anonim verilerin imhası ise talep üzerine gerçekleştirilir.

---

## 3. Teknik Güvenlik Altyapısı

| Güvenlik Katmanı | Uygulanan Standart |
|---|---|
| İletim şifreleme | TLS 1.2+ — tüm bağlantılar zorunlu HTTPS |
| Veri depolama | AES-256 — Supabase PostgreSQL, AB / eu-central-1 (Frankfurt) |
| Şifre koruma | Argon2id — düz metin şifre asla kaydedilmez |
| Oturum yönetimi | İmzalı JWT (8 saat) + refresh token (7 gün) |
| API koruması | CSRF double-submit cookie; rate limiting |
| Erişim kontrolü | Rol tabanlı yetkilendirme; minimum ayrıcalık prensibi |

---

## 4. Veri Paylaşımı ve Üçüncü Taraflar

| Sağlayıcı | Amaç | Veri Durumu |
|---|---|---|
| Supabase (AB, Frankfurt) | Veritabanı, kimlik doğrulama, yedekleme | Hesap ve güvenlik logları — AES-256 şifreli |
| Groq | AI dil modeli çıkarımı | İstek süresince geçici; kalıcı tutulmaz, eğitimde kullanılmaz |
| OpenAI | Arama vektörü (embedding) üretimi | İstek süresince geçici; kalıcı tutulmaz, eğitimde kullanılmaz |
| Stripe | Ödeme işleme | Kart verisi Miron AI sistemlerine aktarılmaz (PCI DSS) |

**Miron AI kullanıcı verilerini reklam, profilleme veya ticari amaçla üçüncü kişilere satmaz ve devretmez.**

Yasal zorunluluk (mahkeme kararı, resmi bilgi talebi) dışında içeriğiniz hiçbir kamu kurumuna açıklanmaz; bu durumda dahi yalnızca yasal olarak zorunlu tutulan minimum bilgi paylaşılır ve mümkün olduğunda Kullanıcı önceden bilgilendirilir.

---

## 5. Veri Saklama Süreleri

| Veri Türü | Saklama Süresi |
|---|---|
| Hesap ve kimlik verileri | Hesap aktif olduğu sürece + 3 yıl |
| Fatura ve ödeme kayıtları | 10 yıl (Türk Ticaret Kanunu zorunluluğu) |
| Güvenlik logları | 90 gün |
| İşlem içeriği (onay verilmezse) | Yalnızca istek süresi — kalıcı kayıt yok |
| Anonim AI verisi (onay verilirse) | Onay geri alınana kadar; talep üzerine imha |

---

## 6. Uluslararası Veri Transferi

Hesap ve güvenlik verileri öncelikli olarak AB/AEA bölgesinde (Supabase, Frankfurt) tutulur. Groq ve OpenAI API çağrıları sırasında işlem içeriği geçici olarak ABD sunucularına iletilebilir; bu transferler GDPR Madde 46 kapsamında Standart Sözleşme Maddeleri (SCCs) güvencesi altında gerçekleştirilir.

---

## 7. Haklarınız

6698 sayılı KVKK md. 11 ve GDPR md. 15-22 kapsamında:

- İşlenen verilerinizi **öğrenme** ve kopyasını **talep etme**
- Yanlış verilerin **düzeltilmesini** isteme
- Verilerinizin **silinmesini veya yok edilmesini** talep etme
- Belirli işlemlerin **kısıtlanmasını** isteme
- Verilerinizi yapılandırılmış formatta **taşıma** (portabilite)
- Verdiğiniz onayı istediğiniz zaman **geri alma**
- Otomatik karar alma ve profillemeye **itiraz etme**

Talepler **kvkk@mironintelligence.com** adresine iletilir; 30 gün içinde yanıtlanır. KVK Kurulu'na şikâyet hakkınız saklıdır (kvkk.gov.tr).

---

## 8. Çocuklar

Platform 18 yaş altı kişilere yönelik değildir. Bu kişilerden bilerek kişisel veri toplanmaz.

---

## 9. Güvenlik İhlali

Olası bir veri ihlali tespit edilmesi halinde yetkili otoritelere 72 saat içinde bildirim yapılır ve etkilenen Kullanıcılar mümkün olan en kısa sürede bilgilendirilir.

---

## 10. Politika Değişiklikleri

Bu politika güncellendiğinde Kullanıcılar e-posta veya platform bildirimi ile en az 15 gün öncesinden bilgilendirilir.

*Miron GROUP LLC — Haziran 2026*
