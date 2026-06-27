import React from 'react'
import SEOHead from '../components/SEOHead.jsx'
import { Hero } from '../components/landing/Hero.jsx'
import { Mirror } from '../components/landing/Mirror.jsx'
import { Gap } from '../components/landing/Gap.jsx'
import { Demo } from '../components/landing/Demo.jsx'
import { SystemDepth } from '../components/landing/SystemDepth.jsx'
import { HowItWorks } from '../components/landing/HowItWorks.jsx'
import { StrategyEngine } from '../components/landing/StrategyEngine.jsx'
import { Automation } from '../components/landing/Automation.jsx'
import { Security } from '../components/landing/Security.jsx'
import { Roi } from '../components/landing/Roi.jsx'
import { Stats } from '../components/landing/Stats.jsx'
import { Control } from '../components/landing/Control.jsx'
import { Ataturk } from '../components/landing/Ataturk.jsx'
import { EliteClub } from '../components/landing/EliteClub.jsx'
import { Ambition } from '../components/landing/Ambition.jsx'
import { Pricing } from '../components/landing/Pricing.jsx'
import { Guarantee } from '../components/landing/Guarantee.jsx'
import { Closing } from '../components/landing/Closing.jsx'

const homeSchema = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  "@id": "https://www.mironintelligence.com/#webpage",
  "name": "Miron AI | Avukatlar İçin Yapay Zekâ Destekli Hukuk Araştırma Asistanı",
  "url": "https://www.mironintelligence.com/",
  "description": "Miron AI, avukatların içtihat, mevzuat ve hukuki araştırma süreçlerini hızlandırmak için geliştirilen yapay zekâ destekli hukuk araştırma asistanıdır.",
  "isPartOf": { "@id": "https://www.mironintelligence.com/#website" },
};

export default function IntroLanding() {
  return (
    <>
    <SEOHead
      title="Avukatlar İçin Yapay Zekâ Destekli Hukuk Araştırma Asistanı"
      description="Miron AI ile içtihat araştırması, sözleşme analizi ve dava risk değerlendirmesi. 700.000+ Yargıtay kararı, kaynaklı yanıtlar. Ücretsiz deneyin."
      canonical="/"
      schema={homeSchema}
    />
    <div className="min-h-screen bg-bg text-white font-ui antialiased overflow-x-hidden">
      <main>
        <Hero />
        <Mirror />
        <Gap />
        <Demo />
        <SystemDepth />
        <HowItWorks />
        <StrategyEngine />
        <Automation />
        <Security />
        <Roi />
        <Stats />
        <Control />
        <Ataturk />
        <EliteClub />
        <Ambition />
        <Pricing />
        <Guarantee />
        <Closing />
      </main>
    </div>
    </>
  )
}
