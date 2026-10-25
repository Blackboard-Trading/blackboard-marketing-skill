import { memo, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { reducedMotion } from './motion'

const ROLL_MS = 420
const DIGIT = /[0-9]/

/** Signed magnitude of a formatted value ("$40.1M", "-$1,234.50", "+12%"); null when it has no digits ("--"). */
export function parseFormatted(s: string): number | null {
  const m = s.replace(/,/g, '').match(/(\d+(?:\.\d+)?)\s*([KMBT])?/i)
  if (!m) return null
  const mult = { K: 1e3, M: 1e6, B: 1e9, T: 1e12 }[(m[2] ?? '').toUpperCase() as 'K'] ?? 1
  const neg = /[-−]/.test(s.slice(0, m.index))
  return (neg ? -1 : 1) * parseFloat(m[1]) * mult
}

// One observer for every instance: off-screen values update without animating.
const visible = new WeakMap<Element, boolean>()
let io: IntersectionObserver | null = null
function observe(el: Element) {
  if (typeof IntersectionObserver !== 'function') return () => {}
  io ??= new IntersectionObserver((entries) => { for (const e of entries) visible.set(e.target, e.isIntersecting) })
  io.observe(el)
  return () => { io?.unobserve(el); visible.delete(el) }
}

// Page-wide guards: at most MAX_ROLLING digits move at once, and any long frame pauses rolling for a moment.
const MAX_ROLLING = 60
const CALM_MS = 2000
let rolling = 0
let calmUntil = 0
let watching = false
function watchLongFrames() {
  if (watching || typeof PerformanceObserver !== 'function') return
  watching = true
  const type = PerformanceObserver.supportedEntryTypes?.includes('long-animation-frame') ? 'long-animation-frame' : 'longtask'
  try { new PerformanceObserver((l) => { if (l.getEntries().some((e) => e.duration > 50)) calmUntil = performance.now() + CALM_MS }).observe({ type }) } catch { /* unsupported */ }
}
const canAnimate = (el: Element | null) => !!el && visible.get(el) === true && !document.hidden && !reducedMotion() && performance.now() > calmUntil
/** In the viewport now (the shared observer has not reported a fresh element yet). */
function inView(el: Element | null) {
  if (!el) return false
  const r = el.getBoundingClientRect()
  return r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth
}
/** The intro frame: every digit at 0, so the first value rolls up from it ("$6,843.63" starts as "$0,000.00"). */
const zeroed = (text: string) => text.replace(/[0-9]/g, '0')
function reserve(n: number) {
  if (n === 0 || rolling + n > MAX_ROLLING) return false
  rolling += n
  setTimeout(() => { rolling -= n }, ROLL_MS)
  return true
}

/** One character slot, keyed from the right so digits keep their place when the string grows or shrinks. */
interface Slot { key: number; ch: string; from: string | null; roll?: string }
interface Frame { text: string; slots: Slot[] }

function buildFrame(prev: Frame | null, text: string, dir: 1 | -1 | 0): Frame {
  const chars = [...text]
  const old = new Map(prev?.slots.map((s) => [s.key, s]))
  const slots = chars.map((ch, i): Slot => {
    const key = chars.length - i
    const p = old.get(key)
    if (dir !== 0 && p && DIGIT.test(ch) && DIGIT.test(p.ch) && p.ch !== ch) {
      // Consecutive rolls alternate between two identical keyframes so the animation restarts without remounting.
      const phase = p.roll?.endsWith('a') ? 'b' : 'a'
      return { key, ch, from: p.ch, roll: (dir > 0 ? 'u' : 'd') + phase }
    }
    return { key, ch, from: null, roll: p?.roll }
  })
  return { text, slots }
}

const Digit = memo(function Digit({ ch, from, roll }: { ch: string; from: string | null; roll?: string }) {
  return (
    <span className="ui-rn-digit" data-roll={from === null ? undefined : roll}>
      {from !== null && <span className="ui-rn-out">{from}</span>}
      <span className="ui-rn-in">{ch}</span>
    </span>
  )
})

/**
 * Odometer-style value for headline stats. Pass the already formatted string (`fmtUsd(x)`, `fmtCompactUsd(x)`, `DASH`);
 * only digits roll, everything else changes in place. `trend` overrides the direction guessed from the strings.
 */
export const AnimatedNumber = memo(function AnimatedNumber({ value, trend, className, title }: {
  value: string
  trend?: 'up' | 'down'
  className?: string
  title?: string
}) {
  const ref = useRef<HTMLSpanElement>(null)
  // On mount a visible value rolls up from zeros once; later changes roll from the previous value.
  const intro = useRef(!reducedMotion() && DIGIT.test(value) && zeroed(value) !== value)
  const [frame, setFrame] = useState<Frame>(() => buildFrame(null, intro.current ? zeroed(value) : value, 0))
  const frameRef = useRef(frame)
  const lastRoll = useRef(0)
  const pending = useRef<ReturnType<typeof setTimeout>>(undefined)
  const latest = useRef({ value, trend })
  latest.current = { value, trend }

  useLayoutEffect(() => { watchLongFrames(); return observe(ref.current!) }, [])
  useEffect(() => () => clearTimeout(pending.current), [])

  useEffect(() => {
    const apply = () => {
      pending.current = undefined
      const f = frameRef.current
      const next = latest.current.value
      if (next === f.text) return
      let dir: 1 | -1 | 0 = 0
      const first = intro.current
      intro.current = false
      if (first) {
        // the page-load guards (long frames, roll budget) do not apply to the one intro roll
        if (inView(ref.current) && !document.hidden) {
          const built = buildFrame(f, next, 1)
          lastRoll.current = performance.now()
          frameRef.current = built
          setFrame(built)
          return
        }
      } else if (canAnimate(ref.current)) {
        const a = parseFormatted(f.text), b = parseFormatted(next)
        const t = latest.current.trend
        dir = t === 'up' ? 1 : t === 'down' ? -1 : a === null || b === null || a === b ? 0 : b > a ? 1 : -1
      }
      let built = buildFrame(f, next, dir)
      if (dir !== 0) {
        if (reserve(built.slots.filter((s) => s.from !== null).length)) lastRoll.current = performance.now()
        else built = buildFrame(f, next, 0)
      }
      frameRef.current = built
      setFrame(built)
    }
    // Updates faster than one roll collapse into a single trailing update with the latest value; nothing queues.
    if (pending.current !== undefined) return
    const wait = lastRoll.current + ROLL_MS - performance.now()
    if (wait > 0 && canAnimate(ref.current)) pending.current = setTimeout(apply, wait)
    else apply()
  }, [value, trend])

  return (
    <span ref={ref} className={'ui-rn' + (className ? ' ' + className : '')} title={title}>
      <span className="ui-rn-value">{frame.text}</span>
      <span className="ui-rn-visual" aria-hidden>
        {frame.slots.map((s) => DIGIT.test(s.ch)
          ? <Digit key={s.key} ch={s.ch} from={s.from} roll={s.roll} />
          : <span key={s.key} className="ui-rn-char" data-char={s.ch} />)}
      </span>
    </span>
  )
})

/** Dates, times and ages ("24/10/2026 11:13:00 GMT+7", "2h ago") never roll: only amounts do. */
const NOT_A_FIGURE = /\d\s*[/:]\s*\d|GMT|\bago\b|\bnow\b/i

/** A formatted figure (string or number with digits) becomes an AnimatedNumber; anything else is returned as is. */
export function rollIfNumber(node: ReactNode): ReactNode {
  if (typeof node === 'number') return <AnimatedNumber value={String(node)} />
  return typeof node === 'string' && DIGIT.test(node) && !NOT_A_FIGURE.test(node) ? <AnimatedNumber value={node} /> : node
}
