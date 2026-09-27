import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import type { RacePlayer, Room } from '@/hooks/useRace'

interface RaceResultProps {
  room: Room
  you: string
  onRematch: () => void
  onLeave: () => void
  /** Set when a rematch cannot start, e.g. the opponent has gone. */
  rematchError?: string | null
  /** The opponent's name once they have pressed Rematch and gone back to the lobby. */
  rematchFrom?: string | null
  /** No rematch to be had: the opponent walked away after the race. */
  rematchDisabled?: boolean
  /** The opponent has left while the result is up. Their score still stands. */
  opponentGone?: boolean
}

/**
 * Both players are still mid-flow when the result lands, so for a moment
 * neither action takes a press: a stray tap used to leave the room or restart
 * the race before anyone had read the numbers. Matches the solo test's
 * Back to Setup.
 */
const ACTIONS_LOCK_MS = 2000

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

export const RaceResult: React.FC<RaceResultProps> = ({
  room,
  you,
  onRematch,
  onLeave,
  rematchError,
  rematchFrom,
  rematchDisabled,
  opponentGone,
}) => {
  const players = Object.values(room.players)
  const me = room.players[you]
  const them = players.find((p) => p.id !== you)

  const [revealed, setRevealed] = useState(false)
  const [verdict, setVerdict] = useState(false)
  // Locked from the first paint rather than from an effect, so there is no
  // frame in which either button is live.
  const [actionsLocked, setActionsLocked] = useState(true)

  useEffect(() => {
    const unlock = setTimeout(() => setActionsLocked(false), ACTIONS_LOCK_MS)
    return () => clearTimeout(unlock)
  }, [])

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
  const margin = Math.abs((me?.wpm ?? 0) - (them?.wpm ?? 0))

  // Both names sit on keys, so a shared name needs a player number to tell
  // them apart. It only appears when there actually is a clash.
  const sameName = Boolean(
    me && them && me.name.trim().toLowerCase() === them.name.trim().toLowerCase()
  )

  return (
    <div className="tt-stage is-mid tt-result">
      <p className="tt-race-eyebrow text-center">
        Race complete &middot; {room.timer} min &middot; {room.difficulty}
      </p>

      <div className="tt-podium">
        <Stand
          player={me}
          label="You"
          wpm={myWpm}
          mine
          won={verdict && iWon && !drew}
          seat={sameName ? 'P1' : undefined}
        />
        <Stand
          player={them}
          label="Opponent"
          wpm={theirWpm}
          won={verdict && !iWon && !drew && !theyQuit}
          seat={sameName ? 'P2' : undefined}
        />
      </div>

      <div className={cn('tt-verdict text-center', verdict && 'is-in')}>
        {theyQuit
          ? 'Your opponent left the race.'
          : drew
            ? 'A dead heat.'
            : iWon
              ? 'You win.'
              : 'You lost this one.'}
      </div>

      {/* Someone leaving does not undo the race they just ran, so the scores
          stay exactly as they were and only this line changes: the margin is
          no longer the useful thing to say. */}
      {opponentGone ? (
        <p className="tt-margin text-center">
          {them?.name ?? 'Your opponent'} has left the lobby.
        </p>
      ) : (
        !theyQuit &&
        !drew &&
        margin > 0 && (
          <p className="tt-margin text-center">
            {iWon ? 'Ahead by' : 'Behind by'} {margin} words per minute
          </p>
        )
      )}

      {rematchError && <div className="tt-race-error tt-result-error">{rematchError}</div>}

      {/* The other player has already gone back for another race. */}
      {rematchFrom && !rematchError && (
        <div className="tt-rematch-note" role="status">
          <span>
            <i className="tt-pulse" />
            {rematchFrom} is ready for a rematch
          </span>
        </div>
      )}

      <div className="tt-result-actions">
        <button
          type="button"
          className={cn('tt-btn tt-btn-primary', actionsLocked && 'is-locked')}
          onClick={onRematch}
          disabled={actionsLocked || Boolean(theyQuit) || Boolean(rematchDisabled)}
        >
          Rematch
        </button>
        <button
          type="button"
          className={cn('tt-btn tt-btn-quiet', actionsLocked && 'is-locked')}
          onClick={onLeave}
          disabled={actionsLocked}
        >
          Leave
        </button>
      </div>
    </div>
  )
}

/** The winning key is pressed: it drops and its edge collapses under it. */
const Stand: React.FC<{
  player?: RacePlayer
  label: string
  wpm: number
  won: boolean
  mine?: boolean
  seat?: string
}> = ({ player, label, wpm, won, mine, seat }) => {
  const gone = Boolean(player && !player.connected && !player.finished)

  return (
    <div className={cn('tt-stand', mine ? 'tt-stand-you' : 'tt-stand-them', gone && 'tt-gone')}>
      <div className={cn('tt-namekey is-big', mine ? 'is-you' : 'is-them', won && 'is-won')}>
        {seat && <em>{seat}</em>}
        {player?.name ?? label}
      </div>

      <div className="tt-score">
        <div className="tt-crown">{won ? 'WINNER' : ''}</div>
        <div className="tt-score-big">{wpm}</div>
        <div className="tt-score-foot">
          WORDS PER MINUTE &middot; {player?.accuracy ?? 0}% ACCURATE
          {gone && <em className="tt-gone-tag">left</em>}
        </div>
      </div>
    </div>
  )
}

export default RaceResult
