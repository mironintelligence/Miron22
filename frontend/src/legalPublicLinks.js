/** DB document type → URL segment under `/legal/:segment`. */
export function legalDocSlug(docType) {
  const t = String(docType || "").trim();
  return t === "ai_terms" ? "ai-terms" : t;
}

export const LEGAL_DOC_TYPE_LABELS = {
  terms: "Kullanım Şartları",
  privacy: "Gizlilik Politikası",
  dpa: "Veri İşleme Sözleşmesi (DPA)",
  cookie: "Çerez Politikası",
  ai_terms: "Yapay Zeka Kullanım Şartları",
  disclaimer: "Sorumluluk Reddi",
  kvkk: "KVKK Aydınlatma Metni",
};

export const LEGAL_DOC_TYPES_ORDER = ["terms", "privacy", "cookie", "ai_terms", "disclaimer", "kvkk", "dpa"];

const ORDER = LEGAL_DOC_TYPES_ORDER;

/** `[slug, label]` for public nav/footer (slug matches `LegalDocument` route). */
export const LEGAL_PUBLIC_LINKS = ORDER.map((t) => [legalDocSlug(t), LEGAL_DOC_TYPE_LABELS[t]]);
