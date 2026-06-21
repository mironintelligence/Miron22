# Yapay Zeka Kullanım Şartları

**Son güncelleme: Haziran 2026**

---

## 1. Kapsam

Bu Yapay Zeka Kullanım Şartları, **Miron GROUP LLC** ("Miron AI") tarafından işletilen platformdaki tüm AI özelliklerini kapsar: AI Asistanı, dava simülasyonu, belge analizi, dilekçe ve sözleşme üretimi, Yargıtay/Danıştay kararı arama, risk skoru ve içtihat özetleme.

---

## 2. Altyapı

| Bileşen | Teknoloji | Amaç |
|---|---|---|
| Dil modeli | Groq API (Llama / Mixtral ailesi) | Metin üretimi, analiz, soru yanıtlama |
| Arama vektörü | OpenAI Embedding API | Semantik arama için vektör üretimi |
| Emsal veritabanı | Supabase GIN (PostgreSQL, Türkçe tam metin) | Yargıtay, Danıştay, AYM karar araması |

Miron AI, büyük dil modellerine erişim için Groq altyapısını birincil olarak, OpenAI'ı ise embedding üretimi için kullanır. Her iki sağlayıcıya da kullanıcı içeriği model eğitimi amacıyla aktarılmaz.

---

## 3. Belge İçeriğinin İşlenmesi

### 3.1 Onay Verilmezse (Varsayılan)

Platforma yüklediğiniz veya işleme gönderdiğiniz belgeler, dava dosyaları ve metinler:

- Yalnızca ilgili isteğin süresiyle sınırlı olarak sunucu belleğinde (RAM) tutulur
- İstek tamamlandığı anda içerik tamamen silinir
- Hiçbir veritabanı kaydı, dosya veya yedek oluşturulmaz
- AI modellerinin eğitimi veya iyileştirilmesi için kullanılmaz
- Üçüncü taraflara aktarılmaz

### 3.2 Kullanıcı Onay Verirse

Kayıt tamamlandıktan sonra sunulan isteğe bağlı onay sorusuna "Evet" yanıtı verirseniz:

- İçerik işlenmeden önce TC kimlik numaraları, isimler, adresler ve tüm kişisel tanımlayıcılar algoritmik olarak kaldırılır (tam anonimleştirme)
- Anonimleştirilmiş içerik, Miron AI'ı geliştirmek amacıyla **anonim veri olarak kaydedilir ve kullanılır**
- Bu onay istediğiniz zaman Ayarlar sayfasından geri alınabilir; geri alım sonrasında yeni içerik kaydedilmez
- Onayın verilmemiş olması hizmet kalitesini, fiyatı veya herhangi bir özelliğe erişimi etkilemez

---

## 4. Yapay Zekanın Sınırları — Zorunlu Okuma

### 4.1 Halüsinasyon Riski

Büyük dil modelleri zaman zaman gerçek olmayan, yanlış veya uydurma bilgi üretir. Bu durum "halüsinasyon" olarak adlandırılır. Hukuk bağlamında halüsinasyon; var olmayan kanun maddeleri, yanlış Yargıtay kararı numaraları, hatalı tarihler veya fiilen uygulanmayan içtihat gibi biçimlerde ortaya çıkabilir. Miron AI bu riski minimize etmek için RAG (Retrieval-Augmented Generation) ve doğrulama katmanları kullanır; ancak sıfır hata **garanti edilemez.**

**Kullanıcı yükümlülüğü:** Tüm AI çıktılarını — kanun maddeleri, karar numaraları ve tarihler dahil — mahkemeye veya müvekkile sunmadan önce resmi kaynaklardan bağımsız olarak doğrulamak.

### 4.2 Güncellik Sorunu

Temel dil modelinin eğitim kesim tarihi bulunur; bu tarihten sonraki mevzuat değişikliklerini otomatik olarak yansıtmaz. RAG sistemi Yargıtay, Danıştay ve AYM kararlarını düzenli olarak günceller; ancak kararın yayımlanması ile sisteme yansıması arasında gecikme olabilir. Platform çıktıları **güncel resmi mevzuatın ve içtihadın yerine geçmez.**

### 4.3 Bağlam Kısıtı

AI modeli davanın tüm koşullarını ve nüanslarını kavrayamaz. Sağladığınız bağlam ne kadar eksiksiz olursa sonuç kalitesi o kadar yükselir — bu, doğru sonuç garantisi anlamına gelmez.

### 4.4 Dava Simülasyonu

Dava simülasyonu özelliği olası senaryoları modellemek için tasarlanmıştır; dava sonucunu tahmin etmez ve hukuki bir değerlendirme niteliği taşımaz. Simülasyon çıktısına dayanarak müvekkile garanti verilemez.

### 4.5 Beta Özellikler

"Beta" olarak etiketlenmiş özellikler geliştirme aşamasındadır ve hata oranı daha yüksek olabilir. Bu çıktılar özellikle dikkatle ve mutlaka bağımsız doğrulamayla kullanılmalıdır.

---

## 5. Kullanıcı Yükümlülükleri

Kullanıcı:

- Platform çıktılarını mesleki bilgi ve yargısıyla değerlendirmek ve gerekli bağımsız araştırmayı yapmakla yükümlüdür
- Üretilen dilekçe, sözleşme veya belgeleri mahkemeye veya karşı tarafa sunmadan önce eksiksiz okuyup gerekli düzeltmeleri yapmakla sorumludur
- Yargıtay kararı numaraları ve mevzuat atıflarını resmi kaynaklardan (Yargıtay Bilgi Bankası, Resmî Gazete, Anayasa Mahkemesi kararlar bankası) teyit etmekle yükümlüdür
- Baro ve meslek kurallarına uyumu tamamen kendi sorumluluğunda saymakla yükümlüdür
- Müvekkil gizliliği ve avukatlık sırrı yükümlülüklerini yerine getirmekten münhasıran sorumludur

---

## 6. Değişmez Hüküm

Miron AI tarafından üretilen içerik — belge taslakları, analizler, simülasyon sonuçları, özetler veya herhangi bir çıktı — **profesyonel hukuki danışmanlık yerine geçmez, geçemez ve bu şekilde yorumlanamaz.**

*Miron GROUP LLC — Haziran 2026*
