-- KVKK aydınlatmada yer tutucu şirket/adres satırını Miron Intelligence Ltd ile değiştir (adres kaldırıldı).
UPDATE legal_documents
SET content = REPLACE(
  content,
  'Ticaret Unvanı: [Şirket Adı], Adres: [Adres], E-posta: kvkk@mironai.com.',
  'Ticaret Unvanı: Miron Intelligence Ltd. E-posta: kvkk@mironintelligence.com.'
)
WHERE type = 'kvkk'
  AND strpos(content, '[Şirket Adı]') > 0;
