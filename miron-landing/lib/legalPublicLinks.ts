/** Ana uygulamadaki `/legal/:slug` rotasıyla uyumlu slug + etiket. */
export const LEGAL_PUBLIC_LINKS: readonly [slug: string, label: string][] = [
  ['terms', 'Kullanım Şartları'],
  ['privacy', 'Gizlilik Politikası'],
  ['cookie', 'Çerez Politikası'],
  ['ai-terms', 'Yapay Zeka Kullanım Şartları'],
  ['disclaimer', 'Sorumluluk Reddi'],
  ['kvkk', 'KVKK Aydınlatma Metni'],
  ['dpa', 'Veri İşleme Sözleşmesi (DPA)'],
] as const
