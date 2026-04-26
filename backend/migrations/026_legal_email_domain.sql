-- Hukuki belge içeriklerinde eski @mironai.com alan adını @mironintelligence.com ile değiştir.
UPDATE legal_documents
SET content = REPLACE(content, '@mironai.com', '@mironintelligence.com')
WHERE strpos(content, '@mironai.com') > 0;
