import { useCallback, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Users } from 'lucide-react'
import LandingNav from '@/components/landing/LandingNav'
import FloatingKeys from '@/components/landing/FloatingKeys'
import HeroVisual from '@/components/landing/HeroVisual'
import { HeroMode, initialHeroMode } from '@/components/landing/heroMode'
import { useHeroScroll } from '@/components/landing/useHeroScroll'
import PassagesSection, { PassagesHandle } from '@/components/landing/PassagesSection'
import RaceSection from '@/components/landing/RaceSection'
import Footer from '@/components/Footer'
import { cn } from '@/lib/utils'

const LandingPage = () => {
  const passagesRef = useRef<PassagesHandle>(null)

  // The hero's 3D key, and whether the hero pins while it plays. A scene
  // that cannot run falls back to its poster, and a poster has nothing to
  // pin for.
  const [heroMode, setHeroMode] = useState<HeroMode>(initialHeroMode)
  const onHeroUnavailable = useCallback(() => setHeroMode((mode) => (mode === 'live' ? 'still' : mode)), [])
  const hero = useHeroScroll(heroMode === 'live')

  // A button rather than an anchor, which would put a fragment in the URL that
  // means nothing to anyone arriving on it later.
  const scrollToPassages = useCallback(() => passagesRef.current?.scrollIntoView(), [])

  return (
    <div className="tt-landing min-h-screen">
      {/* Whole while the 3D story plays; a poster has no story to wait for. */}
      <LandingNav story={heroMode === 'live' ? hero.progress : undefined} />

      {/* One ground under every section above the footer, so the washes and
          the keycaps carry on down the page instead of stopping at the
          hero's edge. It clips what spills off the sides. */}
      <div className="tt-ground">
        <div className="tt-wash-mid" aria-hidden="true" />
        <div className="tt-wash-low" aria-hidden="true" />

      {/* Tall while pinned, so the hero can stay put for a screen of scroll. */}
      <div ref={hero.pinRef} className={cn('tt-hero-pin', hero.pinned && 'is-pinned')}>
      <section ref={hero.heroRef} className="tt-hero relative pt-[92px] sm:pt-[122px]">
        <div className="tt-wash" aria-hidden="true" />
        <div className="tt-wash-2" aria-hidden="true" />
        <FloatingKeys />

        {/* Pinned, the space above the copy gives way first on a short screen. */}
        {hero.pinned && <div className="tt-hero-gap" aria-hidden="true" />}

        <div
          ref={hero.contentRef}
          className={cn(
            'tt-hero-grid relative z-10 mx-auto grid max-w-[1200px] grid-cols-1 items-center gap-0 px-5 sm:px-14 md:grid-cols-[1.02fr_0.98fr] md:gap-[52px]',
            hero.pinned ? 'pt-0' : 'pt-6 sm:pt-[52px]'
          )}
        >
          <div>
            <p className="tt-kicker mb-3 sm:mb-[18px]">Master your typing speed</p>

            <h1 className="text-balance text-[36px] font-normal leading-[1.04] tracking-[-0.03em] sm:text-[60px] sm:tracking-[-0.035em]">
              How fast do you actually type?
            </h1>

            <div className="tt-rule" />

            <p className="hidden max-w-[480px] text-pretty text-[17px] leading-relaxed text-muted-foreground sm:block">
              Test yourself, or race a friend live on the same passage.
            </p>

            <div className="mt-[26px] flex flex-col items-stretch gap-3 sm:mt-[30px] sm:flex-row sm:items-center sm:gap-3.5">
              <Link to="/start" className="tt-btn tt-btn-primary">
                Start a 1-minute test
                <ArrowRight className="h-4 w-4" />
              </Link>
              {/* The race gets a real button rather than a footnote: a grey line
                  under the main button was easy to read straight past. */}
              <Link to="/race" className="tt-btn tt-btn-quiet">
                <Users className="h-[17px] w-[17px]" aria-hidden="true" />
                Race a friend
              </Link>
            </div>

            <p className="mt-3 text-center text-[13px] sm:text-left">
              <button
                type="button"
                onClick={scrollToPassages}
                className="text-muted-foreground underline-offset-4 transition-colors hover:text-primary hover:underline"
              >
                Or see the passages first &rarr;
              </button>
            </p>

            <p className="mt-3.5 text-center text-[13px] text-muted-foreground sm:mt-4 sm:text-left">
              <span className="sm:hidden">No account needed.</span>
              <span className="hidden sm:inline">
                No account needed. Sign in only if you want to keep your history.
              </span>
            </p>
          </div>

          <div className="mt-8 md:mt-0">
            <HeroVisual
              mode={heroMode}
              progress={hero.progress}
              boxRef={hero.boxRef}
              onUnavailable={onHeroUnavailable}
            />
          </div>
        </div>

        {/* As small as the pinned tail, so the race section sets the gap either way. */}
        <div className="tt-hero-tail h-12 sm:h-4" />
      </section>
      </div>

      <RaceSection />

      <PassagesSection ref={passagesRef} />
      </div>

      <Footer />
    </div>
  )
}

export default LandingPage
