## 1. Veri Sorumlusu

**Miron GROUP LLC** ("Miron AI", "biz") olarak kişisel verilerinizin korunmasını temel prensip olarak benimsiyoruz. Platform hukuki belgelerle çalıştığından veri işleme süreçlerimizde **minimizasyon**, **geçicilik**, **şifreleme** ve **şeffaflık** ön plandadır.

İletişim: **mironintelligence@gmail.com** | KVKK başvuruları: **kvkk@mironintelligence.com**

---

## 2. Şifreleme ve Teknik Güvenlik

| Katman | Uygulanan Standart |
|---|---|
| İletim güvenliği | TLS 1.2+ — tüm bağlantılar HTTPS zorunlu |
| Depolama şifreleme | AES-256 — Supabase PostgreSQL, AB / eu-central-1 (Frankfurt) |
| Şifre koruması | Argon2id hash — düz metin asla saklanmaz |
| Oturum yönetimi | İmzalı JWT 8 saat + refresh token 7 gün |
| API güvenliği | CSRF double-submit cookie, minimum ayrıcalık prensibi |

---

## 3. İşlediğimiz Kişisel Veriler

### 3.1 Hesap ve Kimlik Verileri (Kalıcı)

Ad, soyad, e-posta adresi, abonelik planı, fatura bilgileri, hesap oluşturma ve son giriş tarihi. **Baro numarası istenmez ve işlenmez.**

### 3.2 Teknik ve Güvenlik Logları (Sınırlı Süre)

Oturum bilgileri, giriş tarihi/saati, IP adresi, cihaz/tarayıcı bilgisi — güvenlik ve dolandırıcılık önleme amacıyla **90 gün** saklanır, ardından kalıcı olarak silinir.

### 3.3 Yüklenen Belge ve İşlem İçeriği (Geçici)

Kullanıcı'nın yüklediği dava dosyaları, belgeler, sözleşmeler ve metin içerikleri ("işlem içeriği"):

1. **Yalnızca RAM'de:** İlgili API isteğinin süresiyle sınırlı olarak geçici bellekte işlenir
2. **Anonimleştirme:** İşlem biter bitmez müvekkil isimleri, TC kimlik numaraları ve tüm kişisel tanımlayıcılar algoritmik olarak kaldırılır
3. **Kalıcı silme:** Anonimleştirme sonrası içerik bellekten ve geçici depolamadan kalıcı olarak silinir
4. **Model eğitimi yok:** İçerik; LLM eğitimi, ince ayar (fine-tuning) veya model geliştirmesi için kullanılmaz
5. **Arşiv yok:** Kalıcı dosya, veritabanı kaydı veya yedek kopyası oluşturulmaz

### 3.4 Anonim AI İyileştirme Verisi (Yalnızca Açık Onayla)

Kullanıcı, kayıt tamamlandıktan sonra sunulan **isteğe bağlı onay sorusuna** "Evet" yanıtı verirse, işlem içeriği **tam anonimleştirme** (tüm kişisel tanımlayıcıların kaldırılması) sonrasında AI modelini iyileştirmek amacıyla kullanılabilir.

- Bu onay **zorunlu değildir**; verilmemesi hizmet kalitesini, fiyatı veya erişimi etkilemez
- Ayarlar sayfasından dilediğiniz zaman **geri alınabilir**
- Geri alım önceki anonim işlemleri geriye dönük olarak etkilemez

---

## 4. Yapay Zeka Altyapısı ve Üçüncü Taraflar

| Sağlayıcı | Amaç | Veri Durumu |
|---|---|---|
| Supabase | Veritabanı ve kimlik doğrulama | AB bölgesinde AES-256 ile şifreli |
| Groq | AI dil modeli çıkarımı | Yalnızca anlık inference; kalıcı tutulmaz |
| OpenAI | Embedding (arama vektörleri) | Yalnızca embedding; içerik kalıcı tutulmaz |
| Stripe | Ödeme işleme | Kart verisi Miron AI sistemlerinde saklanmaz |

Kullanıcı içeriği hiçbir sağlayıcıya **model eğitimi amacıyla iletilmez.** Miron AI, kullanıcı verilerini **reklam veya profilleme amacıyla satmaz ve devretmez.**

---

## 5. Haklarınız

KVKK md. 11 ve GDPR md. 15-22 kapsamında:

- **Erişim** — işlenen verilerinizi öğrenme
- **Düzeltme** — yanlış verilerin düzeltilmesini talep etme
- **Silme** — verilerinizin silinmesini talep etme
- **Kısıtlama** — belirli işlemlerin durdurulmasını isteme
- **Taşınabilirlik** — verilerinizi yapılandırılmış formatta alma
- **İtiraz** — meşru menfaat kapsamındaki işlemlere itiraz etme
- **Onay geri alma** — verdiğiniz onayı istediğiniz zaman geri alma

Talepler 30 gün içinde yanıtlanır. Başvuru: **kvkk@mironintelligence.com**

---

## 6. Veri Saklama Süreleri

| Veri Türü | Süre |
|---|---|
| Hesap ve kimlik verileri | Hesap aktif olduğu sürece + 3 yıl |
| Fatura ve ödeme kayıtları | 10 yıl (TTK gereği) |
| Güvenlik ve oturum logları | 90 gün |
| Yüklenen belge / işlem içeriği | Yalnızca işlem süresi (saniyeler) |
| Anonim AI iyileştirme verisi | Onay geri alınana kadar |

---

## 7. Uluslararası Veri Transferi

Veriler Supabase altyapısında AB bölgesinde (Frankfurt) tutulmaktadır. Groq ve OpenAI API çağrılarında içerik geçici olarak ABD sunucularına iletilebilir; bu transferler GDPR Madde 46 kapsamında uygun güvencelerle gerçekleştirilir.

---

## 8. Çocuklara İlişkin Veri

Platform 18 yaş altı kişilere yönelik değildir; bu kişilerden bilerek veri toplanmaz.

---

## 9. Değişiklikler

Politika güncellemelerinde Kullanıcılar e-posta veya platform bildirimi ile önceden bilgilendirilir.

*Son güncelleme: Haziran 2026 — Miron GROUP LLC*
