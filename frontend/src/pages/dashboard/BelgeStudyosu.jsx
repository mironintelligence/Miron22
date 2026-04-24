import React from "react";
import HubLanding from "../../dashboard/HubLanding";

const TOOLS = [
  { title: "Evrak Analizi", description: "PDF, DOCX, UYAP formatlarını yükle ve analiz et", href: "/analyze" },
  {
    title: "Sözleşme Analizi",
    description: "Mevcut metni veya dosyayı yükleyin; risk ve uyum analizini görün.",
    href: "/contracts/analysis",
  },
  {
    title: "Sözleşme Oluşturucu",
    description: "Şablon seçin, alanları doldurun, sözleşmeyi üretin.",
    href: "/contracts/builder",
  },
  { title: "Dilekçe Oluşturucu", description: "AI destekli otomatik dilekçe oluştur", href: "/pleadings" },
];

export default function BelgeStudyosu() {
  return <HubLanding color="belge" tools={TOOLS} />;
}
