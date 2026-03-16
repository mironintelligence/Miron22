# Kullanıcı Kabul Testi (UAT) Checklist

## Kimlik Doğrulama
- Login: doğru bilgi ile giriş yapılır, yönlendirme doğru, session yenilenir.
- Login: yanlış şifre ile 401 ve kullanıcıya anlaşılır hata mesajı.
- Logout: oturum kapanır, korumalı sayfalara erişim engellenir.

## Yetkilendirme
- Admin olmayan kullanıcı: `/admin` route’una erişemez.
- Demo kullanıcı: Navbar’da “Hesabı Yükselt” görünür; demo değilse görünmez.

## Sözleşme Merkezi
- Şablonlar: liste yüklenir, şablon seçilince “Sözleşme Oluştur” sekmesine geçer.
- Sözleşme oluşturma: alanlar doldurulup sözleşme metni üretilir.
- Otomatik madde ekleme: madde tipi seçilir, oluşturulan madde metne eklenir.
- Risk analizi: sözleşme metni analiz edilir, risk puanı ve uyum kontrolleri görünür.
- Karşılaştırma: iki sürüm girilince değişiklik özeti ve risk etkileri görünür.

## Export
- Sözleşme export: Word/PDF/UDF/UYAP indirme çalışır ve dosya açılabilir.
- Dilekçe export: Word/PDF/UDF/UYAP indirme çalışır ve dosya açılabilir.

## Hatırlatıcı & Bildirimler
- Hatırlatıcı oluşturma: kayıt oluşur, listede görünür.
- Hatırlatıcı silme: kayıt listeden kalkar.
- Bildirimler: zamanı gelen hatırlatıcı bildirim olarak görünür ve tekrar üretilmez.

## Responsive ve Okunabilirlik
- Mobil/Tablet/Desktop: Navbar menü davranışı, metin satır aralığı ve okunabilirlik kontrol edilir.
- Uzun metin alanları: kaydırma, selection ve kopyalama sorunsuz.

