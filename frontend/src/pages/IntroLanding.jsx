import React from 'react'
import { Preload } from '../components/landing/Preload.jsx'
import { LandingNav } from '../components/landing/LandingNav.jsx'
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
import { LandingFooter } from '../components/landing/LandingFooter.jsx'

export default function IntroLanding() {
  return (
    <div className="min-h-screen bg-bg text-white font-ui antialiased overflow-x-hidden">
      <Preload />
      <LandingNav />
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
      <LandingFooter />
    </div>
  )
}
