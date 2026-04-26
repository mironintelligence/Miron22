import { Preload } from '@/components/landing/Preload'
import { Nav } from '@/components/landing/Nav'
import { Hero } from '@/components/landing/Hero'
import { Mirror } from '@/components/landing/Mirror'
import { Gap } from '@/components/landing/Gap'
import { Demo } from '@/components/landing/Demo'
import { SystemDepth } from '@/components/landing/SystemDepth'
import { HowItWorks } from '@/components/landing/HowItWorks'
import { StrategyEngine } from '@/components/landing/StrategyEngine'
import { Automation } from '@/components/landing/Automation'
import { Security } from '@/components/landing/Security'
import { Roi } from '@/components/landing/Roi'
import { Stats } from '@/components/landing/Stats'
import { Control } from '@/components/landing/Control'
import { Ataturk } from '@/components/landing/Ataturk'
import { EliteClub } from '@/components/landing/EliteClub'
import { Ambition } from '@/components/landing/Ambition'
import { Pricing } from '@/components/landing/Pricing'
import { Closing } from '@/components/landing/Closing'
import { Footer } from '@/components/landing/Footer'

export default function Home() {
  return (
    <>
      <Preload />
      <Nav />
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
        <Closing />
      </main>
      <Footer />
    </>
  )
}
