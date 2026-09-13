import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import type { RacePlayer, Room } from '@/hooks/useRace'

interface RaceResultProps {
  room: Room
  you: string
  onRematch: () => void
  onLeave: () => void
}

/** Counts up rather than landing on the number, so the result arrives slowly. */
const CLIMB_MS = 2200
const HOLD_BEFORE_VERDICT_MS = 700

function useClimb(target: number, active: boolean) {
  const [value, setValue] = useState(0)

  useEffect(() => {
    if (!active) return
    if (target <= 0) {
      setValue(0)
      return
    }

    const started = performance.now()
    let frame = 0

    const step = (now: number) => {
      const t = Math.min(1, (now - started) / CLIMB_MS)
      // Decelerating, so the last few numbers crawl — which is where the
      // tension is.
      const eased = 1 - Math.pow(1 - t, 3)
      setValue(Math.round(target * eased))
      if (t < 1) frame = requestAnimationFrame(step)
    }

    frame = requestAnimationFrame(step)
    return () => cancelAnimationFrame(frame)
  }, [target, active])

  return value
}

export const RaceResult: React.FC<RaceResultProps> = ({ room, you, onRematch, onLeave }) => {
  const players = Object.values(room.players)
  const me = room.players[you]
  const them = players.find((p) => p.id !== you)

  const [revealed, setRevealed] = useState(false)
  const [verdict, setVerdict] = useState(false)

  const myWpm = useClimb(me?.wpm ?? 0, revealed)
  const theirWpm = useClimb(them?.wpm ?? 0, revealed)

  useEffect(() => {
    const start = window.setTimeout(() => setRevealed(true), 500)
    const end = window.setTimeout(() => setVerdict(true), 500 + CLIMB_MS + HOLD_BEFORE_VERDICT_MS)
    return () => {
      window.clearTimeout(start)
      window.clearTimeout(end)
    }
  }, [])

  const iWon = (me?.wpm ?? 0) > (them?.wpm ?? 0)
  const drew = (me?.wpm ?? 0) === (them?.wpm ?? 0)
  const theyQuit = them && !them.connected && !them.finished

  return (
    <div className="tt-result">
      <p className="tt-result-eyebrow">Race complete</p>

      <div className="tt-result-grid">
        <ResultCard player={me} label="You" wpm={myWpm} winner={verdict && iWon && !drew} mine />
        <div className="tt-result-versus">vs</div>
        <ResultCard
          player={them}
          label="Opponent"
          wpm={theirWpm}
          winner={verdict && !iWon && !drew && !theyQuit}
        />
      </div>

      <div className={cn('tt-verdict', verdict && 'is-in')}>
        {theyQuit
          ? 'Your opponent left the race.'
          : drew
            ? 'A dead heat.'
            : iWon
              ? 'You win.'
              : 'You lost this one.'}
      </div>

      <div className="tt-result-actions">
        <button type="button" className="tt-btn tt-btn-primary" onClick={onRematch}>
          New race
        </button>
        <button type="button" className="tt-btn tt-btn-quiet" onClick={onLeave}>
          Done
        </button>
      </div>
    </div>
  )
}

const ResultCard: React.FC<{
  player?: RacePlayer
  label: string
  wpm: number
  winner: boolean
  mine?: boolean
}> = ({ player, label, wpm, winner, mine }) => (
  <div className={cn('tt-result-card', mine && 'is-mine', winner && 'is-winner')}>
    <div className="tt-result-name">{player?.name ?? label}</div>
    <div className="tt-result-wpm tabular-nums">{wpm}</div>
    <div className="tt-result-unit">words per minute</div>
    <div className="tt-result-accuracy tabular-nums">{player?.accuracy ?? 0}% accuracy</div>
  </div>
)

export default RaceResult
