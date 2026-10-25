import { useEffect, useMemo, useRef, useState, type RefObject } from 'react'
import { compact } from '../../lib/format'
import { executed } from '../../lib/feed'
import { useNow } from '../../lib/hooks'
import { feedLive, feedStore, wsStore } from '../../lib/prices'
import { useStore } from '../../lib/store'
import type { FeedItem } from '../../lib/types'
import { BbIcon, type BbIconName } from '../BbIcon'
import { reducedMotion, type Tone } from '../primitives'
import closeArt from '../../assets/feed/close-bolt.svg'
import longArt from '../../assets/feed/long-arrow.svg'
import shortArt from '../../assets/feed/short-arrow.svg'

/** Bursts are committed at most this often, so many orders arrive as one batch. */
const RENDER_MS = 300
const PULSE_MS = 1200

const ART: Partial<Record<BbIconName, string>> = { long: longArt, short: shortArt, lightning: closeArt }

interface Chip { key: string | number; icon: BbIconName; verb: string; amt: string; tone: Tone; age: string; ts: number }

function ageOf(ms: number) {
  const s = Math.max(0, Math.round(ms / 1000))
  return s < 2 ? 'now' : s < 60 ? s + 's' : s < 3600 ? Math.floor(s / 60) + 'm' : Math.floor(s / 3600) + 'h'
}
/** Unavailable notionals read as a dash, never $0. */
const notionalAmt = (n: number | null) => (n === null ? '$—' : '$' + compact(n))
function chipOf(it: FeedItem, now: number): Chip {
  let icon: BbIconName, verb: string, amt: string, tone: Tone
  if (it.type === 'open') { icon = it.isLong ? 'long' : 'short'; verb = it.isLong ? 'Long' : 'Short'; amt = notionalAmt(it.notional); tone = it.isLong ? 'up' : 'down' }
  // Closes and liquidations show their result, as on the trade tape; an unavailable PnL falls back to the size, never $0.
  else { const p = it.pnl; icon = it.type === 'liq' ? 'bust' : 'lightning'; verb = it.type === 'liq' ? 'Liq' : 'Close'; amt = p === null ? notionalAmt(it.notional) : (p > 0.005 ? '+$' : p < -0.005 ? '-$' : '$') + compact(Math.abs(p)); tone = it.type === 'liq' ? 'down' : 'neutral' }
  return { key: it.id, icon, verb, amt, tone, age: ageOf(now - it.ts), ts: it.ts }
}

/** Feed items, re-rendered at most once per `ms` (leading and trailing edge) however fast the store changes. */
function useThrottledFeed(ms: number) {
  const [items, setItems] = useState(() => feedStore.get().items)
  useEffect(() => {
    let last = 0, timer: ReturnType<typeof setTimeout> | undefined
    const flush = () => { timer = undefined; last = Date.now(); setItems(feedStore.get().items) }
    const onChange = () => {
      if (timer) return
      const wait = last + ms - Date.now()
      if (wait <= 0) flush(); else timer = setTimeout(flush, wait)
    }
    const off = feedStore.subscribe(onChange)
    onChange() // pick up a change made between the first render and subscribing
    return () => { off(); clearTimeout(timer) }
  }, [ms])
  return items
}

/** Pulse ring per new order. A burst extends the running pulse instead of restarting it, so the beat stays even. */
function usePulse(ref: RefObject<HTMLElement | null>, pingId: string | number | null) {
  const pulse = useRef<Animation | null>(null)
  useEffect(() => {
    const el = ref.current
    // Skips hidden copies too (the mobile pill is mounted but display:none on desktop).
    if (pingId === null || !el || document.hidden || reducedMotion() || typeof el.animate !== 'function' || !el.getClientRects().length) return
    const running = pulse.current
    if (running?.playState === 'running' && running.effect instanceof KeyframeEffect && running.effect.target === el) {
      const timing = running.effect.getComputedTiming()
      running.effect.updateTiming({ iterations: Math.max(Number(timing.iterations), (timing.currentIteration ?? 0) + 2) })
      return
    }
    pulse.current = el.animate([{ transform: 'scale(1)', opacity: 0.55 }, { transform: 'scale(2.8)', opacity: 0 }], { duration: PULSE_MS, easing: 'ease-out', iterations: 2 })
  }, [ref, pingId])
}

function useFeed() {
  const all = useThrottledFeed(RENDER_MS)
  const items = useMemo(() => executed(all), [all])
  // Only relative ages change while idle (one shared app-wide 1 s ticker); arrivals are driven by the feed store.
  const now = useNow(1000)
  const seen = useRef<Set<string | number> | null>(null)
  // Last order that arrived live; drives the dot's pulse ring. Never cleared.
  const [pingId, setPingId] = useState<string | number | null>(null)
  const newest = items[0]
  useEffect(() => {
    if (!newest) return
    if (!seen.current) { seen.current = new Set(items.slice(0, 40).map((x) => x.id)); return }
    if (seen.current.has(newest.id)) return
    items.slice(0, 40).forEach((x) => seen.current!.add(x.id))
    setPingId(newest.id)
  }, [newest, items])
  // Feed transport liveness, not order frequency: a quiet minute must not read as dead. `now` ticks each second.
  useStore(wsStore)
  const connected = feedLive(now)
  return { items, now, pingId, connected }
}

const LABEL = 'Market activity'
const EMPTY = 'No orders yet'
/** Connected but no order for this long: the pill reads "Quiet" with the time since the last one. */
const QUIET_MS = 5 * 60_000

export const FeedIcon = ({ icon, s = 13 }: { icon: BbIconName; s?: number }) => ART[icon] ? <img className={'tr-feed-ico tr-feed-ico--' + icon} src={ART[icon]} alt="" /> : <BbIcon n={icon} s={s} />

const ChipBody = ({ c, s = 13 }: { c: Chip; s?: number }) => <>
  <FeedIcon icon={c.icon} s={s} /><span className="tr-feed-verb">{c.verb}</span><span className="tr-feed-amt ui-num">{c.amt}</span><small className="tr-feed-age">{c.age}</small>
</>

/** Platform order ticker for phones: the latest order as a pill over the chart, with the feed's connection state. */
export function OrderFeed() {
  const { items, now, pingId, connected } = useFeed()
  const ring = useRef<HTMLElement>(null)
  usePulse(ring, pingId)
  const lastAt = items[0]?.ts
  const quiet = connected && lastAt !== undefined && now - lastAt > QUIET_MS
  const state = !connected ? 'Reconnecting…' : quiet ? 'Quiet' : 'Live'
  const dot = <span className="tr-feed-state">
    <span className={'tr-feed-dot ' + (!connected ? 'is-off' : quiet ? 'is-quiet' : 'is-live')} title={state} aria-hidden>{connected && <i ref={ring} />}</span>
    <span className="ui-sr-only" role="status">{state}</span>
    <span className="tr-feed-label" aria-hidden>{state}{quiet && <small className="tr-feed-age"> {ageOf(now - lastAt)}</small>}</span>
  </span>
  const one = items[0] && chipOf(items[0], now)
  return (
    <section className="tr-feed tr-feed--pill" aria-label={LABEL + ', all traders'}>
      {dot}
      {/* Keyed by the newest order, so the pill content re-enters (CSS, compositor-only) when it changes. */}
      {one ? <span className={'tr-feed-mbody ui-' + one.tone} key={one.key}><ChipBody c={one} s={12} /></span> : <small className="ui-muted">{EMPTY}</small>}
    </section>
  )
}
