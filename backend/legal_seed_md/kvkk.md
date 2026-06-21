## 1. Veri Sorumlusunun Kimliği

6698 sayılı Kişisel Verilerin Korunması Kanunu'nun 10. maddesi kapsamında veri sorumlusu:

**Miron GROUP LLC** ("Miron AI")
- Genel destek: **mironintelligence@gmail.com**
- KVKK başvuruları: **kvkk@mironintelligence.com**

---

## 2. İşlenen Kişisel Veriler ve Amaçları

| Veri Kategorisi | Veriler | İşleme Amacı |
|---|---|---|
| Kimlik ve iletişim | Ad, soyad, e-posta | Hesap oluşturma ve hizmet sunumu |
| Abonelik ve finans | Plan bilgisi, fatura detayları | Abonelik yönetimi, yasal yükümlülük |
| Teknik / güvenlik | IP, oturum ID, cihaz bilgisi | Güvenlik, dolandırıcılık önleme |
| İşlem içeriği | Yüklenen belgeler (geçici, bkz. §4) | AI destekli analiz ve otomasyon |

**Baro numarası istenmez ve işlenmez.**

---

## 3. Kişisel Verilerin İşlenme Hukuki Dayanakları

- **KVKK md. 5/2-c:** Sözleşmenin kurulması ve ifası (hesap, abonelik, ödeme)
- **KVKK md. 5/2-ç:** Hukuki yükümlülük (fatura, vergi kaydı)
- **KVKK md. 5/2-f:** Meşru menfaat (platform güvenliği, dolandırıcılık önleme)
- **KVKK md. 5/1:** Açık rıza (yalnızca opsiyonel anonim AI iyileştirme onayı için)

---

## 4. Yüklenen Belgelerin Özel Durumu

Kullanıcı'nın yüklediği dava dosyaları ve hukuki belgeler ("işlem içeriği") kişisel veri içerebilir. Bu içerik:

- İlgili istek süresince yalnızca **geçici bellekte (RAM)** işlenir
- İşlem biter bitmez **anonimleştirilir** (TC kimlik no, isimler ve diğer tanımlayıcılar kaldırılır)
- Kalıcı olarak **silinir** — veritabanı kaydı, yedek veya arşiv oluşturulmaz
- Büyük dil modellerinin **eğitimi veya ince ayarı için kullanılmaz**
- Depolama şifrelemesi: **AES-256** (Supabase, AB bölgesi); iletim: **TLS 1.2+**

---

## 5. Kişisel Verilerin Aktarıldığı Taraflar

| Taraf | Amaç | Dayanak |
|---|---|---|
| Supabase (AB/Frankfurt) | Veritabanı ve kimlik doğrulama | Sözleşme ifası |
| Groq | AI çıkarımı (inference) | Sözleşme ifası, GDPR md. 46 güvenceleri |
| OpenAI | Embedding/vektör üretimi | Sözleşme ifası, GDPR md. 46 güvenceleri |
| Stripe | Ödeme işleme | Sözleşme ifası |
| Yetkili kamu kuruluşları | Yasal zorunluluk | KVKK md. 8/2-a |

Kullanıcı içeriği hiçbir tarafa **model eğitimi amacıyla** aktarılmaz. Miron AI kişisel verileri **reklam veya profilleme amacıyla satmaz.**

---

## 6. Veri Saklama Süreleri

| Veri | Süre |
|---|---|
| Hesap ve kimlik verileri | Hesap aktif + 3 yıl |
| Fatura ve ödeme kayıtları | 10 yıl (TTK) |
| Güvenlik / oturum logları | 90 gün |
| Yüklenen belge / işlem içeriği | Yalnızca istek süresi (saniyeler) |
| Anonim AI iyileştirme verisi | Onay geri alınana kadar |

---

## 7. KVKK Kapsamındaki Haklarınız

KVKK'nın 11. maddesi uyarınca aşağıdaki haklara sahipsiniz:

- Kişisel verilerinizin işlenip işlenmediğini **öğrenme**
- İşleniyorsa buna ilişkin bilgi **talep etme**
- İşlenme amacını ve amacına uygun kullanılıp kullanılmadığını **öğrenme**
- Yurt içinde veya yurt dışında aktarıldığı üçüncü kişileri **bilme**
- Eksik veya yanlış işlenmiş olması hâlinde **düzeltilmesini isteme**
- KVKK'nın 7. maddesi çerçevesinde **silinmesini veya yok edilmesini isteme**
- Düzeltme ve silme işlemlerinin üçüncü kişilere bildirilmesini **talep etme**
- Otomatik sistemler vasıtasıyla analiz edilmek suretiyle aleyhinize sonuç ortaya çıkmasına **itiraz etme**
- Kanuna aykırı işleme nedeniyle oluşan **zararın giderilmesini talep etme**

**Başvuru:** kvkk@mironintelligence.com — yazılı başvurular 30 gün içinde yanıtlanır.

Kişisel Verileri Koruma Kurulu'na şikâyet hakkınız saklıdır: **kvkk.gov.tr**

---

## 8. Veri Güvenliği Tedbirleri

- **Şifreleme:** AES-256 (depolama), TLS 1.2+ (iletim)
- **Şifre:** Argon2id hash — düz metin asla tutulmaz
- **Erişim kontrolü:** Minimum ayrıcalık prensibi ve dahili erişim loglama
- **Yedekleme:** Hesap verileri için düzenli şifreli yedekleme
- **İhlal bildirimi:** Olası ihlal durumunda KVK Kurulu'na 72 saat içinde bildirim

*Son güncelleme: Haziran 2026 — Miron GROUP LLC*
