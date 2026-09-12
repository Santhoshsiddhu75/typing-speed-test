import { forwardRef, useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { useTypingField } from '@/hooks/useTypingField'
import { cn } from '@/lib/utils'

/** Real text from the passage library — the opening of the coffee passage. */
const TARGET = 'Coffee reached Europe through the trading ports of the Mediterranean.'

/** How long the line sits untouched before it demonstrates itself. */
const AUTOPLAY_AFTER_MS = 6000
const AUTOPLAY_STEP_MS = 58
const AUTOPLAY_HOLD_MS = 1600

export const TryItSection = forwardRef<HTMLElement>((_props, sectionRef) => {
  const navigate = useNavigate()
  const cardRef = useRef<HTMLDivElement>(null)
  const autoTimer = useRef<number | undefined>(undefined)
  const autoReset = useRef<number | undefined>(undefined)

  const [typed, setTyped] = useState('')
  const [startedAt, setStartedAt] = useState<number | null>(null)
  const [elapsedMs, setElapsedMs] = useState(0)

  // Only a real run finishes. The autoplay demonstration deliberately never
  // produces a result — the number belongs to whoever typed it.
  const finished = startedAt !== null && typed.length >= TARGET.length

  const { inputRef, isMobile, focusField, blurField, scrollFieldIntoView, focusHandlers } =
    useTypingField({ scrollTargetRef: cardRef, enabled: !finished })

  const stopAutoplay = useCallback(() => {
    if (autoTimer.current === undefined && autoReset.current === undefined) return
    window.clearInterval(autoTimer.current)
    window.clearTimeout(autoReset.current)
    autoTimer.current = undefined
    autoReset.current = undefined
    setTyped('')
  }, [])

  // Nobody has touched it, so show them what it does. Runs once; any focus or
  // keystroke cancels it and hands control straight back.
  useEffect(() => {
    if (startedAt !== null) return

    const kickoff = window.setTimeout(() => {
      let count = 0
      autoTimer.current = window.setInterval(() => {
        count += 1
        setTyped(TARGET.slice(0, count))

        if (count >= TARGET.length) {
          window.clearInterval(autoTimer.current)
          autoTimer.current = undefined
          autoReset.current = window.setTimeout(() => {
            autoReset.current = undefined
            setTyped('')
          }, AUTOPLAY_HOLD_MS)
        }
      }, AUTOPLAY_STEP_MS)
    }, AUTOPLAY_AFTER_MS)

    return () => {
      window.clearTimeout(kickoff)
      window.clearInterval(autoTimer.current)
      window.clearTimeout(autoReset.current)
      autoTimer.current = undefined
      autoReset.current = undefined
    }
  }, [startedAt])

  const handleFocus = useCallback(() => {
    focusHandlers.onFocus()
    scrollFieldIntoView()
    stopAutoplay()
  }, [focusHandlers, scrollFieldIntoView, stopAutoplay])

  const handleChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      stopAutoplay()

      const value = event.target.value.slice(0, TARGET.length)
      const now = Date.now()
      const begun = startedAt ?? now

      setStartedAt(begun)
      setTyped(value)
      setElapsedMs(now - begun)
    },
    [startedAt, stopAutoplay]
  )

  const reset = useCallback(() => {
    setTyped('')
    setStartedAt(null)
    setElapsedMs(0)
    focusField()
  }, [focusField])

  // On a short screen the keyboard would cover the result and its button at
  // exactly the moment they matter most.
  useEffect(() => {
    if (finished && isMobile) blurField()
  }, [finished, isMobile, blurField])

  let correct = 0
  for (let i = 0; i < typed.length; i += 1) {
    if (typed[i] === TARGET[i]) correct += 1
  }

  const minutes = elapsedMs / 60000
  const wpm = startedAt !== null && minutes > 0 ? Math.round(correct / 5 / minutes) : 0
  const accuracy = startedAt !== null && typed.length > 0 ? Math.round((correct / typed.length) * 100) : 100
  const progress = Math.round((typed.length / TARGET.length) * 100)
  const showPrompt = startedAt === null && typed.length === 0

  return (
    <section ref={sectionRef} className="tt-try relative overflow-hidden py-14 sm:py-[68px]">
      <div className="tt-try-glow" aria-hidden="true" />

      <div className="relative z-10 mx-auto max-w-[880px] px-5 text-center sm:px-10">
        <p className="tt-kicker mb-3">How it works</p>
        <h2 className="text-balance text-[30px] font-normal leading-tight tracking-tight sm:text-[42px]">
          Type one line. See your number.
        </h2>
        <p className="mx-auto mt-3.5 text-pretty text-[15.5px] leading-relaxed text-muted-foreground sm:text-[16.5px]">
          No timer to pick, no account, no setup. About fifteen seconds.
        </p>

        <div ref={cardRef} className="tt-demo-card mt-7 text-left sm:mt-[38px]">
          {showPrompt && (
            <p className="mb-3 flex items-center gap-2.5 text-[13.5px] text-muted-foreground">
              <span className="tt-ping" aria-hidden="true" />
              {isMobile ? 'Tap the line below and start typing' : 'Click the line below and start typing'}
            </p>
          )}

          <div className="relative" onClick={focusField}>
            <input
              ref={inputRef}
              type="text"
              value={typed}
              onChange={handleChange}
              onFocus={handleFocus}
              onBlur={focusHandlers.onBlur}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
              aria-label="Type the sentence shown"
              className="tt-capture"
            />
            <p className="tt-demo-line tt-demo-line-lg" aria-hidden="true">
              {TARGET.split('').map((char, index) => (
                <span
                  key={index}
                  className={cn(
                    'tt-ch',
                    index < typed.length && (typed[index] === char ? 'tt-ch-ok' : 'tt-ch-bad'),
                    index === typed.length && !finished && 'tt-ch-cursor'
                  )}
                >
                  {char}
                </span>
              ))}
            </p>
          </div>

          <div className="tt-bar mt-[22px]">
            <div className="tt-bar-fill" style={{ width: `${progress}%` }} />
          </div>

          <div className="mt-[18px] flex items-center gap-[30px] border-t border-border/60 pt-4">
            <div className="flex items-baseline gap-1.5">
              <span className="tt-stat-num tabular-nums">{wpm}</span>
              <span className="tt-stat-label">WPM</span>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="tt-stat-num tabular-nums">{accuracy}%</span>
              <span className="tt-stat-label">ACCURACY</span>
            </div>
          </div>

          {finished && (
            <div className="mt-5 flex flex-col items-stretch justify-between gap-5 border-t border-border/60 pt-5 sm:flex-row sm:items-center">
              <p className="text-[19px] leading-snug">
                That is <b className="font-semibold text-primary">{wpm} WPM</b> at{' '}
                <b className="font-semibold text-primary">{accuracy}%</b> accuracy.
                <span className="mt-1.5 block text-sm text-muted-foreground">
                  One line is a rough guess. A full minute is a real number.
                </span>
              </p>

              <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
                <button type="button" onClick={reset} className="tt-btn tt-btn-quiet">
                  Try again
                </button>
                <button type="button" onClick={() => navigate('/start')} className="tt-btn tt-btn-primary">
                  Start a 1-minute test
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  )
})

TryItSection.displayName = 'TryItSection'

export default TryItSection
