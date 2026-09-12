import { useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import LandingNav from '@/components/landing/LandingNav'
import FloatingKeys from '@/components/landing/FloatingKeys'
import HeroDemo from '@/components/landing/HeroDemo'
import DemoSection, { DemoHandle } from '@/components/landing/DemoSection'
import Footer from '@/components/Footer'

const LandingPage = () => {
  const navigate = useNavigate()
  const demoRef = useRef<DemoHandle>(null)

  // Not an href anchor: the app runs on HashRouter, which has already spent
  // the URL's hash on routing, so "#try" would break navigation rather than
  // scroll. This keeps working whichever router we end up on.
  //
  // Replaying waits for the scroll to settle, so a finished run restarts as
  // you arrive rather than while you are still travelling. A run already in
  // progress is left alone.
  const scrollToDemo = useCallback(() => {
    demoRef.current?.scrollIntoView()
    window.setTimeout(() => demoRef.current?.replayIfFinished(), 450)
  }, [])

  return (
    <div className="tt-landing min-h-screen">
      <LandingNav onSeeDemo={scrollToDemo} />

      <section className="relative overflow-hidden pt-[92px] sm:pt-[122px]">
        <div className="tt-wash" aria-hidden="true" />
        <div className="tt-wash-2" aria-hidden="true" />
        <FloatingKeys />

        <div className="relative z-10 mx-auto grid max-w-[1200px] grid-cols-1 items-center gap-0 px-5 pt-6 sm:px-14 sm:pt-[52px] md:grid-cols-[1.02fr_0.98fr] md:gap-[52px]">
          <div>
            <p className="tt-kicker mb-3 sm:mb-[18px]">Master your typing speed</p>

            <h1 className="text-balance text-[36px] font-normal leading-[1.04] tracking-[-0.03em] sm:text-[60px] sm:tracking-[-0.035em]">
              How fast do you actually type?
            </h1>

            <div className="tt-rule" />

            <p className="hidden max-w-[480px] text-pretty text-[17px] leading-relaxed text-muted-foreground sm:block">
              Word lists tell you how fast you can hit keys. Prose tells you how fast you can write.
              TapTest gives you three lengths, three levels graded by word length, and text that
              holds together as you type it.
            </p>

            <div className="mt-[26px] flex flex-col items-stretch gap-3 sm:mt-[30px] sm:flex-row sm:items-center sm:gap-3.5">
              <button type="button" onClick={() => navigate('/start')} className="tt-btn tt-btn-primary">
                Start a 1-minute test
                <ArrowRight className="h-4 w-4" />
              </button>
              <button type="button" onClick={scrollToDemo} className="tt-btn tt-btn-quiet">
                Watch a full test
              </button>
            </div>

            <p className="mt-3.5 text-center text-[13px] text-muted-foreground sm:mt-4 sm:text-left">
              <span className="sm:hidden">No account needed.</span>
              <span className="hidden sm:inline">
                No account needed. Sign in only if you want to keep your history.
              </span>
            </p>
          </div>

          <div className="mt-8 flex justify-center md:mt-0">
            <div className="relative w-full max-w-[470px]">
              <div className="tt-card-behind" aria-hidden="true" />
              <HeroDemo className="tt-card-tilt" />
            </div>
          </div>
        </div>

        <div className="h-12 sm:h-[72px]" />
      </section>

      <DemoSection ref={demoRef} />

      <Footer />
    </div>
  )
}

export default LandingPage
