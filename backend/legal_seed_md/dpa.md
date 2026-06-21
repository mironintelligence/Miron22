## 1. Tarafların Rolleri ve Sözleşmenin Amacı

Bu Veri İşleme Sözleşmesi ("DPA"), **Miron GROUP LLC** ("Miron AI", "Veri İşleyen") ile Miron AI platformunu kullanan avukat veya hukuk profesyoneli ("Kullanıcı", "Veri Sorumlusu") arasında, KVKK md. 12 ve GDPR Madde 28 kapsamında akdedilmektedir.

**Kullanıcı**, müvekkil bilgileri ve hukuki belgeler içeren verilerin sahibi ve sorumlusudur. **Miron AI**, Kullanıcı adına ve yalnızca Kullanıcı'nın talimatları doğrultusunda veri işlemekte olup hiçbir koşulda veri sorumlusu konumuna geçmez.

---

## 2. İşlemenin Konusu ve Amacı

| Özellik | Detay |
|---|---|
| Amaç | AI destekli hukuki belge analizi, araştırma, dilekçe/sözleşme üretimi ve otomasyon araçlarının sunulması |
| Veri türleri | Hukuki belgeler, dava dosyaları, sözleşmeler, dilekçeler, analizler |
| Veri sahipleri | Kullanıcı'nın müvekkilleri ve ilgili üçüncü kişiler |
| İşleme süresi | Hizmet sözleşmesinin devam ettiği süre |
| Hukuki dayanak | KVKK md. 5/2-c (sözleşme ifası); GDPR md. 6/1-b |

---

## 3. İşlem İçeriğinin Güvenliği: Şifreleme, Geçicilik ve Silme

### 3.1 Teknik Standartlar

| Katman | Standart |
|---|---|
| Depolama şifreleme | AES-256 — Supabase PostgreSQL, AB / eu-central-1 |
| İletim güvenliği | TLS 1.2+ — tüm API bağlantıları HTTPS |
| Şifre/kimlik bilgileri | Argon2id hash |
| Erişim kontrolü | Rol tabanlı yetkilendirme, minimum ayrıcalık |

### 3.2 İşlem İçeriğinin İşlenme Süreci

Kullanıcı'nın yüklediği veya işleme gönderdiği belge ve metinler:

1. Yalnızca ilgili API isteğinin süresiyle sınırlı olarak **geçici bellekte (RAM)** işlenir
2. İşlem tamamlandığında TC kimlik numaraları, isimler ve tüm kişisel tanımlayıcılar **algoritmik olarak kaldırılarak anonimleştirilir**
3. Anonimleştirme sonrası içerik bellekten ve geçici depolamadan **kalıcı olarak silinir**
4. Büyük dil modellerinin **eğitimi, ince ayarı (fine-tuning) veya iyileştirilmesi için kullanılmaz**
5. Kalıcı dosya, veritabanı kaydı, yedek veya arşiv kopyası **oluşturulmaz**

### 3.3 Anonim AI İyileştirme (Yalnızca Kullanıcı Onayıyla)

Kullanıcı, kayıt sonrası sunulan isteğe bağlı onay sorusuna "Evet" yanıtı verirse, işlem içeriği **tam anonimleştirme** sonrasında AI modelini geliştirmek amacıyla kullanılabilir. Bu onay dilediğiniz zaman Ayarlar sayfasından geri alınabilir.

---

## 4. Miron AI'nın Güvenlik Yükümlülükleri

Miron AI aşağıdaki teknik ve idari tedbirleri uygulamayı taahhüt eder:

- AES-256 şifreleme (depolama) ve TLS 1.2+ (iletim) zorunlu tutulur
- İçsel erişim minimum ayrıcalık prensibiyle kısıtlanır ve loglanır
- Personelin kişisel verilere erişimi yetkilendirme ve gizlilik yükümlülüğüne tabidir
- Güvenlik taramaları ve bağımlılık güncellemeleri düzenli aralıklarla yapılır
- Olası veri ihlali durumunda Kullanıcı ve yetkili otoriteler 72 saat içinde bilgilendirilir

---

## 5. Alt Veri İşleyenler

Miron AI hizmet sunumu için aşağıdaki alt işleyenleri kullanmaktadır:

| Alt İşleyen | Amaç | Veri Konumu |
|---|---|---|
| Supabase | Veritabanı, auth, yedekleme | AB / Frankfurt (eu-central-1) |
| Groq | AI dil modeli çıkarımı | ABD (GDPR md. 46 güvenceleri) |
| OpenAI | Embedding/vektör üretimi | ABD (GDPR md. 46 güvenceleri) |
| Stripe | Ödeme altyapısı | ABD/AB (PCI DSS sertifikalı) |

Alt işleyenler değiştiğinde Kullanıcılar makul süre öncesinde bilgilendirilir.

---

## 6. Uluslararası Veri Transferi

Veriler öncelikli olarak AB/EEA bölgesinde (Supabase, Frankfurt) tutulmaktadır. AI çıkarımı için yapılan Groq ve OpenAI API çağrılarında işlem içeriği geçici olarak ABD sunucularına iletilebilir; bu transferler GDPR Madde 46 kapsamındaki **Standart Sözleşme Maddeleri (SCCs)** aracılığıyla gerçekleştirilir.

---

## 7. Kullanıcı'nın Yükümlülükleri

Veri Sorumlusu sıfatıyla Kullanıcı:
- Yüklediği içeriklerin KVKK ve ilgili mevzuata uygunluğundan sorumludur
- Müvekkil verilerinin platforma aktarılması için gerekli hukuki dayanağa sahip olduğunu beyan eder
- Bir ihlal veya güvenlik açığından haberdar olduğunda derhal **mironintelligence@gmail.com** adresini bilgilendirir

---

## 8. Verilerin İadesi ve Silinmesi

Hizmet sözleşmesinin sona ermesiyle birlikte:
- Kullanıcı'nın talep etmesi halinde işlenen veriler 30 gün içinde aktarılır veya silinir
- Yasal saklama yükümlülükleri dışında kalan tüm kullanıcı verileri silinir

---

## 9. Uygulanacak Hukuk

Bu DPA Türk hukukuna tabidir; GDPR uyumluluğu için Avrupa Birliği veri koruma mevzuatı esas alınır.

*Son güncelleme: Haziran 2026 — Miron GROUP LLC*
