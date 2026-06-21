## 1. Taraflar ve Sözleşmenin Konusu

Bu Kullanım Şartları ("Sözleşme"), **Miron GROUP LLC** ("Miron AI", "Şirket", "biz") ile platforma erişen, kayıt olan veya herhangi bir özelliği kullanan gerçek ya da tüzel kişi ("Kullanıcı", "siz") arasında akdedilmektedir. Platforma erişmek, kayıt olmak veya kullanıma başlamak bu Sözleşme'yi okuduğunuzu, anladığınızı ve bağlayıcılığını kabul ettiğinizi ifade eder.

Bu Sözleşme; Gizlilik Politikası, KVKK / GDPR Aydınlatma Metni, Veri İşleme Sözleşmesi (DPA), Çerez Politikası, Yapay Zeka Kullanım Şartları ve Sorumluluk Reddi ile birlikte bir bütün oluşturur.

---

## 2. Hizmetin Tanımı

Miron AI; Türk avukatlar ve hukuk profesyonelleri için tasarlanmış, yapay zeka teknolojisini kullanan bir hukuk otomasyon SaaS platformudur. Platform şu modülleri kapsar:

- **Dava Merkezi:** Dava dosyası yönetimi, risk ve strateji skoru, dava simülasyonu, takvim ve hatırlatmalar
- **Araştırma:** Yargıtay, Danıştay ve Anayasa Mahkemesi karar araması (Türkçe tam metin), mevzuat analizi
- **Belge Stüdyosu:** Evrak analizi (PDF/DOCX/TXT), sözleşme analizi, sözleşme oluşturucu, dilekçe oluşturucu
- **Hesaplamalar:** Faiz, harç, KDV, vekalet ücreti, icra hesaplamaları
- **AI Asistanı:** Hukuki soru ve analiz desteği

**Değişmez hüküm:** Platform çıktıları hukuki danışmanlık niteliği taşımaz, avukat-müvekkil ilişkisi oluşturmaz.

---

## 3. Veri Güvenliği ve Şifreleme

### 3.1 Teknik Güvenlik Standartları

| Katman | Standart |
|---|---|
| İletim güvenliği | TLS 1.2+ (HTTPS zorunlu) |
| Depolama şifreleme | AES-256 (Supabase, AB/eu-central-1 bölgesi) |
| Şifre hash algoritması | Argon2id — düz metin asla saklanmaz |
| Oturum yönetimi | JWT 8 saat + 7 günlük refresh token |
| CSRF koruması | Double-submit cookie |

### 3.2 Yüklenen Belge ve Dosyaların İşlenmesi

Kullanıcı'nın yüklediği veya işleme gönderdiği belge, dosya ve metin içeriği:

1. Yalnızca ilgili isteğin süresiyle sınırlı olarak **geçici bellekte (RAM)** işlenir
2. İşlem tamamlandığında **kişisel tanımlayıcılar kaldırılarak anonimleştirilir** ve **kalıcı olarak silinir**
3. Büyük dil modellerinin **eğitimi veya ince ayarı (fine-tuning)** için kullanılmaz
4. Kalıcı dosya, veritabanı arşivi veya yedek kopyası olarak tutulmaz

### 3.3 Anonim AI İyileştirme Onayı (Tamamen İsteğe Bağlı)

Kayıt sürecinin tamamlanmasının ardından, ayrı bir onay sorusuyla, yüklediğiniz içeriklerin **müvekkil bilgileri ve tüm kişisel tanımlayıcılar kaldırılmış anonim formda** AI modelini iyileştirmek amacıyla kullanılmasına izin verebilirsiniz. Bu onay:

- Tamamen **isteğe bağlıdır**; verilmemesi hizmet kalitesini, fiyatı veya erişimi etkilemez
- Dilediğiniz zaman **Ayarlar** sayfasından geri alınabilir
- Geri alım önceki anonim işlemleri geriye dönük olarak etkilemez

---

## 4. Kullanıcı Yükümlülükleri

- Platform çıktılarını **bağımsız olarak doğrulamak** ve mesleki değerlendirmeden geçirmek
- Çıktıları mesleki bilgi ve yargıdan bağımsız olarak müvekkile veya mahkemeye sunmamak
- Hesabı yalnızca kendisi kullanmak; üçüncü kişilerle paylaşmamak
- Şüpheli erişim durumunda **mironintelligence@gmail.com** adresine derhal bildirmek
- İlgili baro meslek kurallarına uymak
- **Baro numarası istenmez ve toplanmaz**

---

## 5. Yasaklı Kullanımlar

Şunlar kesinlikle yasaktır; ihlalde hesap derhal kapatılır ve yasal işlem başlatılabilir:

- Sahte dava, sözleşme veya dilekçe oluşturmak
- Yanıltıcı veya hukuka aykırı içerik üretmek
- Sistem güvenliğini ihlale yönelik her türlü girişim (penetrasyon testi dahil)
- Botlar veya otomatik araçlarla kullanım
- Tersine mühendislik veya kaynak koda erişim girişimi
- Platformu yeniden satmak, alt lisanslamak veya rakiplere açmak
- Hesabı birden fazla kişiyle paylaşmak

---

## 6. Abonelik ve Ödeme

Ödeme işlemleri **Stripe** altyapısı üzerinden şifreli iletimle gerçekleştirilir; kart bilgisi Miron AI sistemlerinde saklanmaz.

**30 Gün Tam İade Güvencesi:** İlk ödeme tarihinden itibaren 30 takvim günü içinde yazılı başvuruyla (mironintelligence@gmail.com) ilk dönem ücreti %100 iade edilir. Bu hak hesap başına bir kez ve yalnızca ilk ödeme için geçerlidir.

**Sonraki dönemler:** 30 günden sonra iade yapılmaz; abonelik iptal edilebilir, cari dönem sonunda sona erer.

---

## 7. Yapay Zeka Çıktılarına İlişkin Özel Sorumluluk

Yapay zeka sistemleri zaman zaman yanlış, eksik veya uydurma bilgi üretebilir. Miron AI bu riski minimize etmek için çalışır; ancak hatasız çıktı garanti edilmez. Kullanıcı; tüm çıktıları, atıfları ve içtihat referanslarını resmi kaynaklardan (Resmi Gazete, Yargıtay Bilgi Bankası vb.) bağımsız olarak doğrulamakla yükümlüdür.

---

## 8. Sorumluluk Sınırı

Miron AI'nın herhangi bir olay nedeniyle üstlenebileceği azami sorumluluk, Kullanıcı'nın son bir aylık ödediği abonelik ücretiyle sınırlıdır. Bu sınır; sözleşme ihlali, haksız fiil, ihmal ve diğer tüm hukuki teorilere uygulanır.

---

## 9. Uygulanacak Hukuk

Bu Sözleşme Türk hukukuna tabidir. Uyuşmazlıklarda **İstanbul** Mahkemeleri ve İcra Daireleri münhasıran yetkilidir.

---

## 10. İletişim

| Konu | Adres |
|---|---|
| Genel destek ve iade | mironintelligence@gmail.com |
| KVKK / Kişisel veri başvuruları | kvkk@mironintelligence.com |

*Son güncelleme: Haziran 2026 — Miron GROUP LLC*
