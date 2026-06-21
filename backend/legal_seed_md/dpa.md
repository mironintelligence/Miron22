# Veri İşleme Sözleşmesi (DPA)

**Son güncelleme: Haziran 2026**

---

## 1. Taraflar ve Amaç

Bu Veri İşleme Sözleşmesi ("DPA"), KVKK md. 12 ve GDPR Madde 28 uyarınca:

- **Veri İşleyen:** Miron GROUP LLC ("Miron AI") — Türk avukatlara ve hukuk profesyonellerine yönelik yapay zeka destekli hukuk otomasyon platformunun işleticisi
- **Veri Sorumlusu:** Miron AI'ı kullanan avukat veya hukuk profesyoneli ("Kullanıcı")

arasında akdedilmektedir.

Kullanıcı; müvekkil adları, dava bilgileri ve gizli hukuki içerik gibi üçüncü kişilere ait kişisel veriler içerebilen içeriklerin sahibi ve sorumlusudur. Miron AI bu içerikleri yalnızca Kullanıcı'nın talimatları doğrultusunda ve bu DPA'da tanımlanan sınırlar dahilinde işler. Miron AI hiçbir koşulda söz konusu içerikler bakımından veri sorumlusu konumuna geçmez.

---

## 2. İşlemenin Kapsamı

| Parametre | Değer |
|---|---|
| İşleme konusu | Hukuki belge analizi, araştırma, dilekçe/sözleşme üretimi ve otomasyon araçları |
| İşlenen veri türleri | Dava dosyaları, sözleşmeler, dilekçeler, yazışmalar ve hukuki analizler |
| Kişisel veri sahipleri | Kullanıcı'nın müvekkilleri ve ilgili üçüncü kişiler |
| İşleme süresi | Hizmet sözleşmesinin yürürlükte olduğu süre |

---

## 3. Belge İçeriğinin İşlenme Modeli

### 3.1 Kullanıcı Onay Vermezse (Varsayılan)

Platforma yüklenen veya işleme gönderilen tüm içerik:

1. Yalnızca ilgili API isteğinin süresiyle sınırlı olarak sunucu belleğinde (RAM) tutulur
2. İstek tamamlandığı anda içerik tamamen bellekten silinir
3. Veritabanına, dosya sistemine, log kayıtlarına veya yedeğe hiçbir şekilde yazılmaz
4. AI modellerinin eğitimi, ince ayarı veya iyileştirilmesi için kullanılmaz
5. Üçüncü taraflara aktarılmaz

Sonuç: İşlem içeriğine ait hiçbir kayıt kalmaz.

### 3.2 Kullanıcı Onay Verirse

1. İçerik işlenmeden önce TC kimlik numaraları, müvekkil/karşı taraf isimleri, adres bilgileri ve kişiyi ya da davayı tanımlamaya yarayabilecek tüm tanımlayıcılar algoritmik olarak tespit edilip kaldırılır (tam anonimleştirme)
2. Anonimleştirme tamamlandıktan sonra içerik, AI sistemini geliştirmek amacıyla **anonim veri olarak** kaydedilir
3. Kaydedilen veri artık kişisel veri niteliği taşımaz ve KVKK kapsamına girmez
4. Kullanıcı, onayını Ayarlar sayfasından geri alabilir; geri alım sonrasında yeni içerik kaydedilmez

Her iki senaryoda da içerik model eğitimi amacıyla üçüncü taraflara aktarılmaz.

---

## 4. Teknik Güvenlik Standartları

| Katman | Standart |
|---|---|
| Depolama şifreleme | AES-256 — Supabase PostgreSQL, AB / eu-central-1 (Frankfurt) |
| İletim güvenliği | TLS 1.2+ — tüm API bağlantıları zorunlu HTTPS |
| Kimlik bilgileri | Argon2id hash — düz metin şifre saklanmaz |
| Oturum yönetimi | JWT (8 saat) + refresh token (7 gün) |
| Erişim kontrolü | Rol tabanlı yetkilendirme; minimum ayrıcalık prensibi |

---

## 5. Miron AI'nın Yükümlülükleri

Miron AI:

- İçeriği yalnızca bu DPA'da belirtilen amaçlar için işler; başka amaçla kullanmaz
- Güvenlik standartlarını (AES-256, TLS 1.2+, Argon2id) kesintisiz uygular
- Verilere erişimi yetkilendirilmiş personelle sınırlar ve erişimleri loglar
- Olası veri ihlalini 72 saat içinde Kullanıcı'ya ve yetkili otoritelere bildirir
- Alt işleyen listesini güncel tutar ve değişikliklerden Kullanıcıları önceden haberdar eder

---

## 6. Alt İşleyenler

| Alt İşleyen | Amaç | Konum |
|---|---|---|
| Supabase | Veritabanı, auth, yedekleme | AB — Frankfurt (eu-central-1) |
| Groq | AI dil modeli çıkarımı | ABD (GDPR md. 46 — SCCs) |
| OpenAI | Embedding/vektör üretimi | ABD (GDPR md. 46 — SCCs) |
| Stripe | Ödeme altyapısı | ABD/AB (PCI DSS sertifikalı) |

Belge içeriği; Groq ve OpenAI'a yalnızca ilgili istek süresince geçici olarak iletilir, model eğitimi amacıyla kullanılmaz.

---

## 7. Kullanıcı'nın Yükümlülükleri

Veri Sorumlusu sıfatıyla Kullanıcı:

- Yüklediği içerikleri platforma aktarmak için KVKK ve ilgili mevzuat kapsamında gerekli hukuki dayanağa sahip olduğunu beyan ve taahhüt eder
- Müvekkil verilerinin platformda işlenmesine ilişkin KVKK md. 12 kapsamındaki yükümlülüklerini (gizlilik, güvenlik, bildirim) yerine getirmekten sorumludur
- Güvenlik şüphesi veya ihlalini öğrenmesi halinde derhal **mironintelligence@gmail.com** adresine bildirim yapar

---

## 8. Verilerin İadesi ve Silinmesi

Hizmet sözleşmesinin sona ermesinden itibaren:

- Hesap verileri 30 gün içinde Kullanıcı'nın talebi üzerine dışa aktarılır veya silinir
- İşlem içeriğine (onay verilmemiş) ait herhangi bir kalıcı kayıt bulunmamaktadır
- Yasal saklama yükümlülükleri (fatura, vergi kaydı) dışındaki tüm veriler imha edilir

---

## 9. Uygulanacak Hukuk

Bu DPA Türk hukukuna tabidir; GDPR uyumluluğu için AB veri koruma mevzuatı esas alınır. Uyuşmazlıklarda İstanbul Mahkemeleri yetkilidir.

*Miron GROUP LLC — Haziran 2026*
