import React from "react";
import HubLanding from "../../dashboard/HubLanding";

const TOOLS = [
  { title: "Risk & Strateji Skoru", description: "AI tabanlı kazanma ihtimali ve strateji önerisi", href: "/risk" },
  { title: "Dava Simülasyonu", description: "Senaryoya göre olası mahkeme süreçlerini simüle et", href: "/case-simulation" },
  { title: "Hatırlatıcı & Takvim", description: "Duruşma tarihlerini kaydet, bildirim al", href: "/reminders" },
];

export default function DavaMerkezi() {
  return <HubLanding color="dava" tools={TOOLS} />;
}
