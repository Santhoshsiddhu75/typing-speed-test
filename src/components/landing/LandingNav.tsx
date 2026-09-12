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
 * The landing page's own bar, in two states.
 *
 * At rest it is one wide card holding everything. On scroll it splits: the
 * card's surface drops away and the two groups inside it grow surfaces of
 * their own, so one bar becomes two capsules with the page showing between
 * them. The logo shrinks as they separate.
 *
 * Both states are solid. There is no transparent phase at any point, so nav
 * text can never sit on top of page text — which is why there is no blurred
 * scrim behind them: with solid islands it only smeared the page into a ghost.
 */
export const LandingNav: React.FC<LandingNavProps> = ({ onSeeDemo }) => {
  const navigate = useNavigate()
  const { isAuthenticated } = useAuth()
  const [scrolled, setScrolled] = useState(false)

  // index.css pins html and body (position: fixed; overflow: hidden) and makes
  // #root the scroll container, so window.scrollY never moves and scroll
  // events never reach window — they do not bubble. Listen on both and take
  // whichever is actually moving.
  useEffect(() => {
    const root = document.getElementById('root')

    const read = () => {
      const offset = Math.max(window.scrollY || 0, root?.scrollTop || 0)
      setScrolled(offset > 8)
    }

    read()
    window.addEventListener('scroll', read, { passive: true })
    root?.addEventListener('scroll', read, { passive: true })

    return () => {
      window.removeEventListener('scroll', read)
      root?.removeEventListener('scroll', read)
    }
  }, [])

  return (
    <header className="pointer-events-none fixed left-0 right-0 top-0 z-50">
      <div
        className={cn(
          'tt-nav-ease relative mx-auto mt-3 transition-all duration-500',
          scrolled ? 'max-w-[1180px] px-4 sm:px-8' : 'max-w-[1240px] px-4 sm:px-6'
        )}
      >
        <div
          className={cn(
            'tt-nav-ease flex items-center justify-between border transition-all duration-500',
            scrolled
              ? 'border-transparent bg-transparent p-0 shadow-none'
              : 'tt-nav-surface rounded-2xl border-border/60 px-5 py-3.5 shadow-md sm:px-8 sm:py-4'
          )}
        >
          {/* Left island. */}
          <Link
            to="/"
            aria-label="TapTest home"
            className={cn(
              'tt-island tt-nav-spring pointer-events-auto flex flex-shrink-0 items-center gap-2.5',
              scrolled && 'is-split px-3 py-2 sm:px-4'
            )}
          >
            <Logo size={scrolled ? 'small' : 'medium'} showText={false} clickable={false} />
            <span className="tt-wordmark">TapTest</span>
          </Link>

          {/* Right island. */}
          <div
            className={cn(
              'tt-island tt-nav-spring pointer-events-auto flex items-center gap-4 sm:gap-5',
              scrolled && 'is-split px-3 py-2 sm:px-4'
            )}
          >
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
                scrolled ? 'h-[32px] px-3.5' : 'h-[40px] px-5'
              )}
            >
              Start typing
            </button>

            {/* Inside the split capsule the toggle's own bordered circle reads
                as a button inside a button, so it drops to a bare icon. It
                keeps the circle at rest, where it sits on open background and
                needs the edge. twMerge lets these override the component's
                defaults rather than fighting them. */}
            <ThemeOnlyToggle
              className={cn(
                'transition-all duration-500',
                scrolled &&
                  'h-8 w-8 border-0 bg-transparent shadow-none backdrop-blur-none hover:bg-transparent hover:shadow-none sm:h-8 sm:w-8'
              )}
            />
          </div>
        </div>
      </div>
    </header>
  )
}

export default LandingNav
