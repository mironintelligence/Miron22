import React from "react";
import HubLanding from "../../dashboard/HubLanding";

const TOOLS = [
  { title: "Evrak Analizi", description: "PDF, DOCX, UYAP formatlarını yükle ve analiz et", href: "/analyze" },
  { title: "Sözleşme Analizi & Oluşturucu", description: "Sözleşmeyi incele, risk bul veya sıfırdan üret", href: "/contracts" },
  { title: "Dilekçe Oluşturucu", description: "AI destekli otomatik dilekçe oluştur", href: "/pleadings" },
];

export default function BelgeStudyosu() {
  return <HubLanding color="belge" tools={TOOLS} />;
}
