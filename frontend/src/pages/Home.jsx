import React from "react";
import { motion } from "framer-motion";
import DashboardHero from "../dashboard/DashboardHero";
import HubCard from "../dashboard/HubCard";
import BottomTiles from "../dashboard/BottomTiles";

const DAVA_TOOLS = [
  { label: "Dava Dosyası" },
  { label: "Risk & Strateji Skoru" },
  { label: "Dava Simülasyonu" },
  { label: "Hatırlatıcı & Takvim" },
];

const ARASTIRMA_TOOLS = [
  { label: "Yargıtay Karar Arama", beta: true },
  { label: "Mevzuat Analizi", beta: true },
];

const BELGE_TOOLS = [
  { label: "Evrak Analizi" },
  { label: "Sözleşme Analizi" },
  { label: "Sözleşme Oluşturucu" },
  { label: "Dilekçe Oluşturucu" },
];

export default function Home() {
  return (
    <div
      className="dash-root max-w-[1200px] mx-auto px-5 md:px-10"
      style={{ paddingBottom: 120 }}
    >
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className="flex flex-col"
        style={{ gap: 16 }}
      >
        <DashboardHero activeCases={3} todayHearings={1} />

        <div
          className="dash-font-serif"
          style={{
            fontWeight: 700,
            fontSize: 11,
            letterSpacing: 2,
            textTransform: "uppercase",
            color: "#2a2a2a",
            marginTop: 36,
            marginBottom: 16,
          }}
        >
          Çalışma Alanları
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <HubCard
            color="dava"
            title="Dava Merkezi"
            description="Davalarınızı açın, risk skorlarını hesaplatın ve simülasyonlarla süreci öngörün."
            tools={DAVA_TOOLS}
            href="/dashboard/dava-merkezi"
          />
          <HubCard
            color="arastirma"
            title="Araştırma"
            description="Yargıtay emsal kararları ve mevzuat üzerinde AI destekli hızlı analiz."
            tools={ARASTIRMA_TOOLS}
            href="/dashboard/arastirma"
          />
          <HubCard
            color="belge"
            title="Belge Stüdyosu"
            description="Evrak, sözleşme ve dilekçeleri analiz edin veya sıfırdan oluşturun."
            tools={BELGE_TOOLS}
            href="/dashboard/belge-studyosu"
            minHeight={320}
          />
        </div>

        <div style={{ marginTop: 24 }}>
          <BottomTiles />
        </div>
      </motion.div>
    </div>
  );
}
