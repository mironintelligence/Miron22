# KVKK Aydınlatma Metni

**Son güncelleme: Haziran 2026**

---

## 1. Veri Sorumlusu

6698 sayılı Kişisel Verilerin Korunması Kanunu'nun ("KVKK") 10. maddesi uyarınca, veri sorumlusu sıfatıyla kimliğimizi bildiririz:

**Unvan:** Miron GROUP LLC
**Platform:** Miron AI — Yapay Zeka Destekli Hukuk Otomasyon Platformu
**Genel iletişim:** mironintelligence@gmail.com
**KVKK başvuruları:** kvkk@mironintelligence.com

---

## 2. İşlenen Kişisel Veriler, Amaçları ve Hukuki Dayanakları

### 2.1 Hesap ve Kimlik Verileri

**Veriler:** Ad, soyad, e-posta adresi, şifre (Argon2id ile hash'lenmiş), seçilen abonelik planı, hesap oluşturma tarihi, son giriş tarihi.

**İşlenme amacı:** Hesap oluşturma, kimlik doğrulama, abonelik yönetimi ve hizmet sunumu.

**Hukuki dayanak:** KVKK md. 5/2-c — sözleşmenin kurulması ve ifası için zorunluluk.

**Not:** Baro numarası hiçbir koşulda istenmez ve işlenmez.

### 2.2 Fatura ve Ödeme Verileri

**Veriler:** Abonelik planı, ödeme tarihi, fatura bilgileri. Kart bilgileri Miron AI sistemlerinde saklanmaz; ödeme işlemleri PCI DSS sertifikalı Stripe altyapısıyla gerçekleştirilir.

**İşlenme amacı:** Abonelik yönetimi, fatura düzenleme, yasal muhasebe yükümlülüklerinin karşılanması.

**Hukuki dayanak:** KVKK md. 5/2-ç — hukuki yükümlülüğün yerine getirilmesi.

### 2.3 Teknik ve Güvenlik Logları

**Veriler:** IP adresi, oturum kimliği, giriş/çıkış zaman damgaları, başarısız giriş denemeleri, cihaz ve tarayıcı bilgisi, güvenlik olayı kayıtları.

**İşlenme amacı:** Hesap güvenliği, yetkisiz erişim tespiti ve dolandırıcılık önleme.

**Hukuki dayanak:** KVKK md. 5/2-f — veri sorumlusunun meşru menfaati.

**Saklama süresi:** 90 gün — ardından kalıcı olarak silinir.

### 2.4 Yüklenen Belge ve İşlem İçeriği

Kullanıcı'nın platforma yüklediği veya işleme gönderdiği dava dosyaları, sözleşmeler, dilekçeler ve hukuki metinler kişisel veri içerebilir. Bu içerik iki farklı şekilde işlenir:

**Onay verilmezse (varsayılan):** İçerik yalnızca ilgili API isteğinin süresiyle sınırlı olarak sunucu belleğinde (RAM) işlenir. İstek tamamlandığında içerik tamamen bellekten silinir. Hiçbir kayıt, arşiv veya yedek oluşturulmaz. İşlenen kişisel veri sıfırdır.

**Hukuki dayanak:** KVKK md. 5/2-c — hizmet sözleşmesinin ifası.

**Onay verilirse:** İçerik, tüm kişisel tanımlayıcılar (TC kimlik numarası, isimler, adresler) algoritmik olarak kaldırılarak tam anonimleştirilir. Anonimleştirme sonrasında içerik **anonim veri** olarak kaydedilir ve AI sistemini geliştirmek amacıyla kullanılır. Anonimleştirilmiş veri, KVKK kapsamında kişisel veri sayılmaz.

**Hukuki dayanak:** KVKK md. 5/1 — açık rıza.

---

## 3. Verilerin Aktarıldığı Taraflar ve Aktarım Güvenceleri

| Alıcı | Aktarım Amacı | Güvence |
|---|---|---|
| Supabase (AB/Frankfurt) | Veritabanı ve kimlik doğrulama altyapısı | GDPR uyumlu AB bölgesi |
| Groq (ABD) | AI dil modeli çıkarımı (inference) | GDPR md. 46 — SCCs |
| OpenAI (ABD) | Arama vektörü (embedding) üretimi | GDPR md. 46 — SCCs |
| Stripe (ABD/AB) | Ödeme işleme | GDPR md. 46 — SCCs; PCI DSS |
| Yetkili kamu kuruluşları | Yasal zorunluluk | KVKK md. 8/2-a |

İşlem içeriği hiçbir alıcıya model eğitimi amacıyla aktarılmaz. Kişisel veriler reklam veya profilleme amacıyla satılmaz ve üçüncü kişilere devredilmez.

---

## 4. Veri Güvenliği

| Tedbir | Ayrıntı |
|---|---|
| Depolama şifrelemesi | AES-256 (Supabase, AB bölgesi) |
| İletim şifrelemesi | TLS 1.2+ — tüm bağlantılar HTTPS zorunlu |
| Şifre koruma | Argon2id hash — düz metin asla saklanmaz |
| Oturum güvenliği | JWT (8 saat TTL) + refresh token (7 gün) |
| Erişim kontrolü | Rol tabanlı yetkilendirme; minimum ayrıcalık prensibi |
| İhlal bildirimi | KVK Kurulu'na 72 saat içinde bildirim yükümlülüğü |

---

## 5. Veri Saklama Süreleri

| Veri Kategorisi | Süre |
|---|---|
| Hesap ve kimlik verileri | Hesap aktif olduğu sürece + 3 yıl |
| Fatura ve ödeme kayıtları | 10 yıl (TTK gereği) |
| Güvenlik logları | 90 gün |
| İşlem içeriği (onay verilmezse) | Yalnızca istek süresi — kalıcı kayıt yok |
| Anonim veri (onay verilirse) | Onay geri alınana kadar; talep üzerine imha |

---

## 6. KVKK Kapsamındaki Haklarınız

KVKK'nın 11. maddesi uyarınca aşağıdaki haklara sahipsiniz:

- Kişisel verilerinizin işlenip işlenmediğini **öğrenme**
- İşlenmiş ise bilgi **talep etme**
- İşlenme amacını ve amaca uygun kullanılıp kullanılmadığını **öğrenme**
- Yurt içi veya yurt dışında aktarıldığı tarafları **bilme**
- Eksik veya yanlış işlenmişse **düzeltilmesini isteme**
- KVKK md. 7 çerçevesinde **silinmesini veya yok edilmesini isteme**
- Düzeltme/silme işlemlerinin üçüncü kişilere bildirilmesini **talep etme**
- Otomatik sistemler aracılığıyla aleyhinize sonuç doğurmasına **itiraz etme**
- Kanuna aykırı işleme sebebiyle oluşan **zararın giderilmesini talep etme**

**Başvuru yöntemi:** kvkk@mironintelligence.com adresine ad, soyad ve talebinizi açıklayan bir e-posta. Başvurular 30 gün içinde yanıtlanır.

KVK Kurulu'na şikâyet için: **kvkk.gov.tr**

---

## 7. Çerezler

Miron AI yalnızca teknik olarak zorunlu çerezler kullanır (oturum, CSRF, refresh token). Reklam veya pazarlama çerezleri kullanılmaz. Ayrıntı için Çerez Politikası'na bakınız.

---

## 8. Değişiklikler

Bu metnin güncellenmesi halinde Kullanıcılar e-posta veya platform bildirimi ile önceden bilgilendirilir.

*Miron GROUP LLC — Haziran 2026*
