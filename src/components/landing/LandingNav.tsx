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
 */
export const LandingNav: React.FC<LandingNavProps> = ({ onSeeDemo }) => {
  const navigate = useNavigate()
  const { isAuthenticated } = useAuth()
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header
      className={cn(
        'fixed left-0 right-0 top-0 z-50 transition-all duration-300',
        scrolled && 'border-b border-border/60 bg-background/80 backdrop-blur-sm'
      )}
    >
      <div
        className={cn(
          'mx-auto flex max-w-[1200px] items-center justify-between transition-all duration-300',
          scrolled ? 'px-5 py-2.5 sm:px-14' : 'px-5 py-4 sm:px-14'
        )}
      >
        <Logo size="small" showTagline={false} clickable />

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
            className="hidden h-[38px] items-center whitespace-nowrap rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-md transition-all duration-200 hover:shadow-lg sm:inline-flex"
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
