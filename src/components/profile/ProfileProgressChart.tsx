import React, { useEffect, useMemo, useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import { useIntroProgress } from '@/hooks/useIntroProgress'
import { TestResult } from '@/types'

interface ProfileProgressChartProps {
  /** Newest-first or oldest-first both work; they get sorted by date. */
  data: TestResult[]
  /** How many of the most recent tests to plot. */
  count?: number
  /** Left out, it grows with the width the way the design does. */
  height?: number
  className?: string
}

/**
 * Words per minute over the last handful of tests, drawn straight onto the page
 * rather than inside a card: a hairline baseline, one dashed guide, a soft green
 * fill under a green line, and a dot on the latest result. The line draws itself
 * once on mount, which is why its length is measured rather than guessed.
 */
const ProfileProgressChart: React.FC<ProfileProgressChartProps> = ({
  data,
  count = 12,
  height: fixedHeight,
  className,
}) => {
  const wrapRef = useRef<HTMLDivElement>(null)
  const lineRef = useRef<SVGPathElement>(null)
  const [width, setWidth] = useState(0)
  const [length, setLength] = useState(0)

  const height = fixedHeight ?? (width >= 480 ? 184 : width >= 380 ? 148 : 112)

  useEffect(() => {
    const el = wrapRef.current
    if (!el) return

    setWidth(el.clientWidth)

    if (typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver((entries) => {
      setWidth(entries[0].contentRect.width)
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const points = useMemo(() => {
    const ordered = [...data].sort((a, b) => {
      const at = a.created_at ? Date.parse(a.created_at) : 0
      const bt = b.created_at ? Date.parse(b.created_at) : 0
      return at - bt
    })
    return ordered.slice(-count).map((test) => Math.max(0, Math.round(test.wpm)))
  }, [data, count])

  const { line, area, endX, endY, midY } = useMemo(() => {
    const top = 14
    const bottom = height - 8

    if (width <= 0 || points.length === 0) {
      return { line: '', area: '', endX: 0, endY: bottom, midY: (top + bottom) / 2 }
    }

    const lo = Math.min(...points)
    const hi = Math.max(...points)
    // A flat run would divide by zero, and a tiny spread would look dramatic.
    const pad = Math.max(4, (hi - lo) * 0.25)
    const yMin = Math.max(0, lo - pad)
    const yMax = hi + pad
    const span = yMax - yMin || 1

    const x = (i: number) => (points.length === 1 ? width : (i * width) / (points.length - 1))
    const y = (value: number) => bottom - ((value - yMin) / span) * (bottom - top)

    const coords = points.map((value, i) => `${x(i).toFixed(1)},${y(value).toFixed(1)}`)
    const path = `M${coords.join(' L')}`

    return {
      line: path,
      area: `${path} L${width.toFixed(1)},${bottom} L0,${bottom} Z`,
      endX: x(points.length - 1),
      endY: y(points[points.length - 1]),
      midY: (top + bottom) / 2,
    }
  }, [points, width, height])

  // The dash is driven frame by frame rather than by a CSS transition: a
  // transition needs the browser to paint the undrawn state first, and it does
  // not reliably get the chance, which showed up as the line arriving complete.
  useEffect(() => {
    const el = lineRef.current
    if (!el || !line) {
      setLength(0)
      return
    }
    setLength(el.getTotalLength())
  }, [line])

  const draw = useIntroProgress(length > 0, 1400, 640)

  const label =
    points.length > 1
      ? `Words per minute across your last ${points.length} tests, from ${points[0]} to ${points[points.length - 1]}`
      : 'Words per minute over time'

  return (
    <div ref={wrapRef} className={cn('w-full', className)}>
      <svg
        width="100%"
        height={height}
        viewBox={`0 0 ${Math.max(width, 1)} ${height}`}
        role="img"
        aria-label={label}
        style={{ display: 'block', overflow: 'visible' }}
      >
        <line
          className="tt-pf-f tt-pf-d7"
          x1="0"
          y1={height - 8}
          x2={width}
          y2={height - 8}
          stroke="var(--pf-hair)"
          strokeWidth="1"
        />
        <line
          className="tt-pf-f tt-pf-d7"
          x1="0"
          y1={midY}
          x2={width}
          y2={midY}
          stroke="var(--pf-hair-soft)"
          strokeWidth="1"
          strokeDasharray="2 4"
        />

        {line && (
          <>
            <path
              className="tt-pf-f tt-pf-d13"
              d={area}
              fill="var(--primary)"
              fillOpacity="0.12"
            />
            <path
              ref={lineRef}
              className="tt-pf-draw"
              d={line}
              fill="none"
              stroke="var(--pf-num)"
              strokeWidth="2"
              strokeLinejoin="round"
              style={
                length
                  ? { strokeDasharray: length, strokeDashoffset: length * (1 - draw) }
                  : undefined
              }
            />
            <circle className="tt-pf-f tt-pf-d14" cx={endX} cy={endY} r="3.5" fill="var(--pf-num)" />
          </>
        )}
      </svg>
    </div>
  )
}

export default ProfileProgressChart
