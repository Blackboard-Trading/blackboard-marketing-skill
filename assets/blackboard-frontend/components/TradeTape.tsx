import { useEffect, useRef, useState } from 'react'
import { compact, fmtPrice, fmtUsd, fmtUsdSigned, timeAgo } from '../lib/format'
import { priceDecimals } from '../lib/config'
import { executed } from '../lib/feed'
import { feedStore } from '../lib/prices'
import { useStore } from '../lib/store'
import type { FeedItem } from '../lib/types'
import { CoinIcon } from './Icons'
import { Tooltip, reducedMotion } from './primitives'
import { FeedIcon } from './trade/OrderFeed'

/**
 * Both replay recent trades while it is quiet; the tooltip carries each trade's time.
 * `landing`: the hero tape, lifts big trades. `dock`: the trade screen's tab bar, quiet styling so it never competes with the chart.
 */
export type TapeVariant = 'landing' | 'dock'

const VARIANTS = {
  landing: { speed: 180, ambient: true, highlight: true, coin: 16 },
  dock: { speed: 180, ambient: false, highlight: false, coin: 14 },
} as const

const RECENT = 50
const GAP = 20
const QUEUE_MAX = 40
/** Without a live trade for this long, the recent trades replay as if new. */
const IDLE_MS = 6000
const RETRY_MS = 250
/** Trades at least this size (notional, USD) stand out. */
const BIG = 500_000
const STILL_MAX = 12
const MARKS = Array.from({ length: 20 }, (_, i) => i)

/**
 * A run enters from just off the left edge (x = -w), so it starts moving only once mounted and measured (`born`).
 * `frozen` is the x it is held at while any trade is hovered (the whole tape holds, so nothing runs into it).
 */
type Run = { seq: number; it: FeedItem; w: number; born?: number; frozen?: number }

const between = (lo: number, hi: number) => lo + Math.random() * (hi - lo)
/** Replay comes in clusters of 1-4 trades, some chained, then usually a lull long enough to empty the tape, so it reads as live flow. */
const clusterSize = () => { const r = Math.random(); return r < 0.4 ? 1 : r < 0.7 ? 2 : r < 0.9 ? 3 : 4 }
const inClusterGap = () => (Math.random() < 0.5 ? between(80, 300) : between(600, 2400))
const lullGap = (crossMs: number) => (Math.random() < 0.3 ? between(2000, 4500) : crossMs + between(1500, 7000))

function shuffled<T>(list: T[]) {
  const a = list.slice()
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]] }
  return a
}

const signed = (n: number) => (n > 0.005 ? '+$' : n < -0.005 ? '-$' : '$') + compact(Math.abs(n))

function TapeChip({ it, big, coin }: { it: FeedItem; big: boolean; coin: number }) {
  const p = it.pnl
  const verb = it.type === 'open' ? (it.isLong ? 'Long' : 'Short') : it.type === 'liq' ? 'Liq' : 'Close'
  const icon = it.type === 'open' ? (it.isLong ? 'long' : 'short') : it.type === 'liq' ? 'bust' : 'lightning'
  // Opens show their size; closes and liquidations show their result.
  const amt = it.type === 'open' ? (it.notional === null ? '$—' : '$' + compact(it.notional)) : p === null ? '$—' : signed(p)
  const pnl = it.type === 'open' || p === null ? '' : p > 0.005 ? ' is-win' : p < -0.005 ? ' is-loss' : ''
  return <span className={'trade-tape-chip is-' + (it.type === 'open' ? (it.isLong ? 'long' : 'short') : it.type) + (big ? ' is-big' : '')}>
    <CoinIcon coin={it.coin} size={coin} />
    <span className="trade-tape-verb"><FeedIcon icon={icon} s={11} />{verb}</span>
    <span className={'trade-tape-amt ui-num' + pnl}>{amt}</span>
  </span>
}

function TapeTip({ it }: { it: FeedItem }) {
  const tone = it.type === 'open' ? (it.isLong ? 'ui-up' : 'ui-down') : it.type === 'liq' ? 'ui-down' : undefined
  const head = (it.type === 'open' ? 'Open ' : it.type === 'liq' ? 'Liquidated ' : 'Closed ') + (it.isLong ? 'Long' : 'Short')
  const priceLabel = it.type === 'open' ? 'Entry price' : it.type === 'liq' ? 'Liq price' : 'Exit price'
  return <span className="tr-feed-tip">
    <span className="tr-feed-tip-head"><b className={tone}>{head}</b><b>{it.coin}</b></span>
    <span className="tr-feed-tip-row"><span>Size</span><span className="ui-num">{fmtUsd(it.notional, 0)}{it.leverage ? <i>{it.leverage}×</i> : null}</span></span>
    <span className="tr-feed-tip-row"><span>{priceLabel}</span><span className="ui-num">{fmtPrice(it.price, priceDecimals(it.coin))}</span></span>
    {it.type !== 'open' && <span className="tr-feed-tip-row"><span>PnL</span><span className={'ui-num' + (it.pnl === null ? '' : it.pnl > 0.005 ? ' ui-up' : it.pnl < -0.005 ? ' ui-down' : '')}>{fmtUsdSigned(it.pnl)}</span></span>}
    <span className="tr-feed-tip-row"><span>Time</span><span>{timeAgo(it.ts)}</span></span>
  </span>
}

/** Platform trade tape: each trade runs out from the left and back-to-back trades chain. */
export function TradeTape({ variant = 'landing' }: { variant?: TapeVariant }) {
  const v = VARIANTS[variant]
  const { items } = useStore(feedStore)
  const [still] = useState(reducedMotion)
  const [runs, setRuns] = useState<Run[]>([])
  const lane = useRef<HTMLDivElement>(null)
  const nodes = useRef(new Map<number, { el: HTMLElement; w: number }>())
  const queue = useRef<FeedItem[]>([])
  const seen = useRef<Set<string> | null>(null)
  const newest = useRef(0)
  const recent = useRef<FeedItem[]>([])
  const lastLive = useRef(0)
  const hover = useRef<number | null>(null)
  const kick = useRef(() => {})

  useEffect(() => {
    const trades = executed(items)
    recent.current = trades.slice(0, RECENT)
    if (!trades.length) return
    // A reload after a reconnect backfills trades older than the newest one shown: they are history, not live.
    const arrived = seen.current ? trades.filter((x) => !seen.current!.has(x.id) && x.ts >= newest.current).reverse() : []
    seen.current = new Set(trades.map((x) => x.id))
    newest.current = Math.max(newest.current, trades[0].ts)
    if (!arrived.length) return
    lastLive.current = Date.now()
    if (document.hidden) return
    queue.current = [...queue.current, ...arrived].slice(-QUEUE_MAX)
    kick.current()
  }, [items])

  useEffect(() => {
    if (still) return
    let timer: ReturnType<typeof setTimeout>, deck: FeedItem[] = [], last: FeedItem | undefined, left = clusterSize()
    const tick = () => {
      const idle = Date.now() - lastLive.current
      let wait = RETRY_MS
      if (idle < IDLE_MS) wait = IDLE_MS - idle
      else if (recent.current.length && queue.current.length < 3 && !document.hidden) {
        // Each pass shows every recent trade once, in a fresh order, so the loop has no visible pattern.
        if (!deck.length) {
          deck = shuffled(recent.current)
          if (deck.length > 1 && deck.at(-1) === last) [deck[0], deck[deck.length - 1]] = [deck[deck.length - 1], deck[0]]
        }
        last = deck.pop()!
        queue.current.push(last)
        kick.current()
        if (--left > 0) wait = inClusterGap()
        else { left = clusterSize(); wait = lullGap(((lane.current?.clientWidth ?? 0) * 1000) / v.speed) }
      }
      timer = setTimeout(tick, wait)
    }
    timer = setTimeout(tick, 600)
    return () => clearTimeout(timer)
  }, [still, v])

  useEffect(() => {
    const box = lane.current
    if (still || !box) return
    let raf = 0, seq = 0, live: Run[] = [], width = box.clientWidth
    const ro = new ResizeObserver(() => { width = box.clientWidth })
    ro.observe(box)
    const xOf = (r: Run, now: number) => r.frozen ?? -r.w + (r.born === undefined ? 0 : ((now - r.born) * v.speed) / 1000)
    const step = (now: number) => {
      raf = 0
      let changed = false
      const held = hover.current !== null
      for (const r of live) {
        if (r.born === undefined) {
          const n = nodes.current.get(r.seq)
          if (n && !held) { r.w = n.el.offsetWidth; r.born = now }
        } else if (held && r.frozen === undefined) r.frozen = xOf(r, now)
        else if (!held && r.frozen !== undefined) { r.born = now - ((r.frozen + r.w) * 1000) / v.speed; r.frozen = undefined }
      }
      const keep = live.filter((r) => xOf(r, now) < width)
      if (keep.length !== live.length) { live = keep; changed = true }
      const tail = live.at(-1)
      if (queue.current.length && (!tail || (tail.born !== undefined && xOf(tail, now) >= GAP))) {
        live = [...live, { seq: ++seq, it: queue.current.shift()!, w: 0 }]
        changed = true
      }
      for (const r of live) { const n = nodes.current.get(r.seq); if (n && r.born !== undefined) { n.el.style.transform = `translate3d(${xOf(r, now).toFixed(1)}px, -50%, 0)`; n.el.classList.toggle('is-held', r.seq === hover.current) } }
      if (changed) setRuns(live)
      if (live.length || queue.current.length) raf = requestAnimationFrame(step)
    }
    kick.current = () => { if (!raf) raf = requestAnimationFrame(step) }
    kick.current()
    return () => { cancelAnimationFrame(raf); ro.disconnect(); kick.current = () => {} }
  }, [still, v])

  const shown = still ? executed(items).slice(0, STILL_MAX).map((it, seq) => ({ seq, it, w: 0 })) : runs
  return (
    <div className={`trade-tape trade-tape--${variant}` + (still ? ' is-still' : '')}>
      {v.ambient && <div className="trade-tape-ambient" aria-hidden><div>{[0, 1].map((g) => <div key={g}>{MARKS.map((i) => <span key={i}>BLACKBOARD</span>)}</div>)}</div></div>}
      <div className="trade-tape-lane" ref={lane} role="group" aria-label="Recent trades">
        {shown.map((r) => (
          <span key={r.seq} className="trade-tape-run" onMouseEnter={() => { hover.current = r.seq; kick.current() }} onMouseLeave={() => { if (hover.current === r.seq) hover.current = null; kick.current() }} ref={(el) => { if (el) nodes.current.set(r.seq, { el, w: el.offsetWidth }); else nodes.current.delete(r.seq) }}>
            <Tooltip content={<TapeTip it={r.it} />} className="trade-tape-tipwrap" interactive={false} focusable={false}><TapeChip it={r.it} big={v.highlight && r.it.notional !== null && r.it.notional >= BIG} coin={v.coin} /></Tooltip>
          </span>
        ))}
      </div>
    </div>
  )
}
