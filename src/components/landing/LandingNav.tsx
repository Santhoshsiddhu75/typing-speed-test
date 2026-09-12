import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ThemeOnlyToggle } from '@/components/ThemeOnlyToggle'
import { useAuth } from '@/hooks/useAuth'
import { cn } from '@/lib/utils'

interface LandingNavProps {
  /** Scrolls to the try-it section; an href anchor cannot be used here. */
  onTryIt: () => void
}

/**
 * The landing page's own bar. Deliberately not a variant of `Navbar`, which
 * carries back-button logic, auth state and the feedback modal for a different
 * job — bending it would make both worse. Shares `ThemeOnlyToggle` so the
 * control looks and sits the same on both.
 */
export const LandingNav: React.FC<LandingNavProps> = ({ onTryIt }) => {
  const navigate = useNavigate()
  const { isAuthenticated } = useAuth()
  const [scrolled, setScrolled] = useState(false)

  // Start typing only appears once the hero's own button has gone, so the two
  // never compete for the same click.
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 420)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header
      className={cn(
        'fixed top-0 left-0 right-0 z-50 transition-all duration-300',
        scrolled && 'border-b border-border/60 bg-background/80 backdrop-blur-sm'
      )}
    >
      <div
        className={cn(
          'mx-auto flex max-w-[1200px] items-center justify-between transition-all duration-300',
          scrolled ? 'px-5 py-3 sm:px-14' : 'px-5 py-5 sm:px-14'
        )}
      >
        <Link to="/" className="flex flex-shrink-0 items-center gap-2.5" aria-label="TapTest home">
          <svg className="h-8 w-8 sm:h-[34px] sm:w-[34px]" viewBox="0 0 64 64" aria-hidden="true">
            <rect x="8" y="14" width="48" height="40" rx="9" fill="var(--primary-deep, var(--primary))" />
            <rect x="8" y="9" width="48" height="40" rx="9" fill="var(--primary)" />
            <rect x="17" y="17" width="30" height="23" rx="5" fill="var(--background)" />
          </svg>
          <span className="text-lg font-bold tracking-wide sm:text-[19px]">TapTest</span>
        </Link>

        <div className="flex items-center gap-4 sm:gap-5">
          <div className="flex items-center gap-6">
            {/* Dropped at phone width — the hero's own button sits right under it. */}
            <button
              type="button"
              onClick={onTryIt}
              className="hidden text-sm text-muted-foreground transition-colors hover:text-foreground sm:inline"
            >
              Try it
            </button>
            <Link
              to={isAuthenticated ? '/profile' : '/login'}
              className="whitespace-nowrap text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              {isAuthenticated ? 'Profile' : 'Sign in'}
            </Link>
          </div>

          {/* Never on phones: nothing persistent to tap there is a deliberate
              trade, so each section below carries its own call to action. */}
          <button
            type="button"
            onClick={() => navigate('/start')}
            className={cn(
              'hidden h-[38px] items-center whitespace-nowrap rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-md transition-all duration-300 hover:shadow-lg sm:inline-flex',
              scrolled ? 'scale-100 opacity-100' : 'pointer-events-none scale-95 opacity-0'
            )}
          >
            Start typing
          </button>

          <ThemeOnlyToggle />
        </div>
      </div>
    </header>
  )
}

export default LandingNav
