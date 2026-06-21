## 1. Yapay Zeka Teknolojisinin Doğası

Miron AI platformu, **büyük dil modelleri (LLM)**, **Türkçe tam metin arama (GIN/BM25)** ve **retrieval-augmented generation (RAG)** tekniklerini kullanır. Bu teknolojilerin kullanımı aşağıdaki koşullara tabidir.

---

## 2. İçerik İşleme: Model Eğitimi Yok, Geçici İşleme

Kullanıcı'nın yüklediği veya işleme gönderdiği belge ve metin içeriği:

1. **RAM'de geçici:** Yalnızca ilgili isteğin süresiyle sınırlı olarak geçici bellekte işlenir
2. **Anonimleştirme:** İşlem sonunda tüm kişisel tanımlayıcılar (TC no, isimler vb.) algoritmik olarak kaldırılır
3. **Kalıcı silme:** Anonimleştirme sonrası içerik bellekten ve geçici depolamadan kalıcı olarak silinir
4. **Eğitim yasağı:** İçerik büyük dil modellerinin **eğitimi, ince ayarı (fine-tuning) veya iyileştirilmesi için kullanılmaz**
5. **Arşiv yok:** Kalıcı dosya veya veritabanı kaydı oluşturulmaz

**Şifreleme:** Tüm veriler depolamada AES-256, iletimde TLS 1.2+ ile korunur.

---

## 3. Opsiyonel: Anonim AI İyileştirme Onayı

Kayıt tamamlandıktan sonra sunulan **isteğe bağlı** onay sorusuna "Evet" yanıtı verirseniz:

- Yüklediğiniz içerikler **tam anonimleştirme** (tüm müvekkil bilgilerinin ve kişisel tanımlayıcıların kaldırılması) sonrasında AI modelini iyileştirmek amacıyla kullanılabilir
- Bu onay **zorunlu değildir**; verilmemesi hizmet kalitesini veya erişimi etkilemez
- **Ayarlar** sayfasından dilediğiniz zaman geri alınabilir

---

## 4. Yapay Zeka Sınırlılıkları

### 4.1 Halüsinasyon (Uydurma) Riski

Yapay zeka sistemleri zaman zaman **gerçek olmayan, yanlış veya uydurma** bilgi üretebilir. Bu risk hukuk bağlamında **özellikle ciddidir.** Miron AI riski minimize etmek için çalışır; ancak hatasız çıktı **garanti edilmez.**

**Kullanıcı yükümlülüğü:** Tüm yapay zeka çıktılarını — kanun maddeleri, Yargıtay kararı numaraları ve tarihler dahil — **resmi kaynaklardan (Resmi Gazete, Yargıtay Bilgi Bankası, Lexpera vb.) bağımsız olarak doğrulamak.**

### 4.2 Güncellik Sınırı

- Temel LLM modeli eğitim kesim tarihinden sonraki mevzuat değişikliklerini otomatik olarak bilmeyebilir
- RAG sistemi Yargıtay/Danıştay kararlarını ve mevzuatı güncel tutar; ancak yayımlanma ile sistem güncellenmesi arasında gecikme olabilir
- Platform özetleri ve atıfları **resmi kaynakların yerine geçmez**

### 4.3 Bağlam Bağımlılığı

Her davanın kendine özgü koşulları tam olarak modellenemeyebilir. Sağlanan bağlam ne kadar eksiksiz olursa çıktı kalitesi o kadar artar — bu yine de hatasız sonuç garantisi anlamına gelmez.

### 4.4 Beta Özellikler

"Beta" olarak işaretlenen özellikler geliştirme aşamasındadır; hata oranı daha yüksek olabilir. Bu çıktılar **mutlaka** bağımsız olarak doğrulanmalıdır.

---

## 5. Kullanıcı'nın Temel Yükümlülükleri

Kullanıcı, platform çıktılarını kullanmadan önce:

- **Bağımsız hukuki araştırma** yapmak ve çıktıyı mesleki bilgisiyle değerlendirmek
- Atıflı mevzuat ve kararları **resmi kaynaklardan teyit etmek**
- Üretilen belgeleri **tam okuyup gerekli düzenlemeleri yapmak**
- Müvekkile sunumda **mesleki bağımsız değerlendirme** yapmak
- Müvekkil gizliliği yükümlülüklerine uymak

ile yükümlüdür.

---

## 6. Yapay Zeka Altyapısı

| Bileşen | Sağlayıcı | Kullanım |
|---|---|---|
| Dil modeli | Groq (Llama/Mixtral ailesi) | Metin üretimi, analiz, asistan |
| Embedding | OpenAI | Semantik vektör arama |
| Emsal arama | Supabase GIN (PostgreSQL) | Yargıtay, Danıştay, AYM kararları |

Hiçbir sağlayıcıya kullanıcı içeriği **model eğitimi amacıyla** iletilmez.

---

## 7. Değişmez Hüküm

Miron AI tarafından üretilen her türlü içerik — belge, analiz, simülasyon çıktısı, öneri veya başka herhangi bir çıktı — **profesyonel hukuki danışmanlık yerine geçmez, geçemez ve bu şekilde yorumlanamaz.**

*Son güncelleme: Haziran 2026 — Miron GROUP LLC*
