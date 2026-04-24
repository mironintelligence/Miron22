import React from "react";
import HubLanding from "../../dashboard/HubLanding";

const TOOLS = [
  { title: "Yargıtay Karar Arama", description: "Emsal karar ara, anında AI yorumu al", href: "/yargitay", beta: true },
  { title: "Mevzuat Analizi", description: "Kanun ve madde bazlı AI açıklama ve strateji", href: "/mevzuat", beta: true },
];

export default function Arastirma() {
  return <HubLanding color="arastirma" tools={TOOLS} />;
}
