import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Logo from '@/components/Logo'
import { ThemeOnlyToggle } from '@/components/ThemeOnlyToggle'
import { useAuth } from '@/hooks/useAuth'
import { cn } from '@/lib/utils'

interface LandingNavProps {
  /** Scrolls to the demo section; an href anchor cannot be used here. */
  onSeeDemo: () => void
}

/**
 * The landing page's own bar. Deliberately not a variant of `Navbar`, which
 * carries back-button logic and the feedback modal for a different job.
 * Shares `Logo` and `ThemeOnlyToggle` so both bars look like siblings.
 *
 * At rest it is a full-width, transparent strip sitting over the hero. Past
 * the fold it contracts into a floating pill: narrower, inset from the top,
 * frosted and shadowed. The frosting is the point — a barely-tinted bar lets
 * text slide visibly underneath it, which is what made the old one look messy.
 */
export const LandingNav: React.FC<LandingNavProps> = ({ onSeeDemo }) => {
  const navigate = useNavigate()
  const { isAuthenticated } = useAuth()
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 32)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header className="pointer-events-none fixed left-0 right-0 top-0 z-50">
      <div
        className={cn(
          'tt-nav-ease mx-auto transition-all duration-500',
          scrolled ? 'mt-3.5 max-w-[920px] px-3 sm:px-4' : 'mt-0 max-w-[1240px] px-5 sm:px-14'
        )}
      >
        <div
          className={cn(
            'tt-nav-ease pointer-events-auto flex items-center justify-between rounded-full border transition-all duration-500',
            scrolled
              ? 'tt-nav-pill border-border/70 px-4 py-1.5 shadow-xl sm:px-6'
              : 'border-transparent bg-transparent px-0 py-5 shadow-none sm:py-7'
          )}
        >
          <Logo size={scrolled ? 'small' : 'medium'} showTagline={false} clickable />

          <div className="flex items-center gap-4 sm:gap-5">
            <div className="flex items-center gap-6">
              {/* Dropped at phone width — the hero's own button sits right under it. */}
              <button
                type="button"
                onClick={onSeeDemo}
                className="hidden text-sm text-muted-foreground transition-colors hover:text-foreground sm:inline"
              >
                See it work
              </button>
              <Link
                to={isAuthenticated ? '/profile' : '/login'}
                className="whitespace-nowrap text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                {isAuthenticated ? 'Profile' : 'Sign in'}
              </Link>
            </div>

            {/* Between Sign in and the theme toggle, and always present.
                Phones keep it off: agreed earlier, and it does not fit beside
                the logo, Sign in and the toggle at 390px. */}
            <button
              type="button"
              onClick={() => navigate('/start')}
              className={cn(
                'tt-nav-ease hidden items-center whitespace-nowrap rounded-full bg-primary text-sm font-semibold text-primary-foreground shadow-md transition-all duration-500 hover:shadow-lg sm:inline-flex',
                scrolled ? 'h-[36px] px-4' : 'h-[38px] px-5'
              )}
            >
              Start typing
            </button>

            <ThemeOnlyToggle />
          </div>
        </div>
      </div>
    </header>
  )
}

export default LandingNav
