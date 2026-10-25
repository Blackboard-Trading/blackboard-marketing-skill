// Open positions at the streamed quotes, shared by every Trade-page reader (dock rows, mobile strip and sheet, Close all).
// Readers subscribe to the quotes of their positions' markets only, and livePos runs once per changed position.
import { useMemo } from 'react'
import { configStore, marketBySymbol, v1 } from '../../lib/config'
import { usdOf } from '../../lib/format'
import { netPnl } from '../../lib/math'
import { priceFreshness } from '../../lib/price-age'
import { useDisplayQuotes } from '../../lib/display-price'
import { serverNow } from '../../lib/server-clock'
import type { Account, Position, PriceTick } from '../../lib/types'

/** A displayed quote (lib/display-price); `source` 'backend' marks the backup. */
type Quote = PriceTick & { source?: string }

/** A position valued at the displayed quote, with the backend's freshness policy: a stale quote is used and flagged, an
 *  expired one gives no mark and no PnL. No displayed quote: no mark and no PnL either (`--`); the backend's own
 *  valuation is never shown in its place. `markBackup`: the quote is the backend backup (lib/chart-ticks). */
export function livePos(p: Position, quote?: Quote, now = serverNow()): Position {
  const market = marketBySymbol(p.coin), impact = market?.impact
  if (!quote) return { ...p, mark: null, pnl: null, pnlPct: null, markAt: null, markStale: false, markBackup: false }
  const markBackup = quote.source === 'backend'
  if (!market || !impact) return { ...p, mark: quote.mid, markAt: quote.t, markStale: false, markBackup, pnl: null, pnlPct: null }
  const freshness = priceFreshness(quote.t, now, market.maxPriceAgeSec)
  if (freshness === 'expired') return { ...p, mark: null, pnl: null, pnlPct: null, liquidatable: null, markAt: quote.t, markStale: true, markBackup }
  // A position without a well-formed entry has no computable PnL (shown as a dash, never 0).
  if (p.raw.entry === null) return { ...p, mark: quote.mid, markAt: quote.t, markStale: freshness === 'stale', markBackup, pnl: null, pnlPct: null }
  const pnl = usdOf(netPnl({ entry: p.raw.entry, margin: p.raw.margin, leverage: p.leverage, isLong: p.isLong }, quote.raw, impact, v1().params.winFeeBps))
  return { ...p, mark: quote.mid, markAt: quote.t, markStale: freshness === 'stale', markBackup, pnl, pnlPct: pnl === null || !p.margin ? null : (pnl / p.margin) * 100 }
}

type Quotes = readonly (Quote | undefined)[]
const sameList = <T,>(a: readonly T[], b: readonly T[]) => a.length === b.length && a.every((v, i) => v === b[i])

/** The displayed quote of each coin (the chart feed, lib/display-price), stable while none of them changes. */
export function useQuotes(coins: readonly string[]): Quotes {
  return useDisplayQuotes(coins)
}

// livePos depends on the clock only through the quote's freshness class, so (position, quote, class) fixes its result.
// The deployment config (impact, fees) is part of the key too.
const cache = new WeakMap<Position, { quote: Quote | undefined; freshness: string; cfg: unknown; out: Position }>()
let last: { positions: Position[]; out: Position[] } | null = null

function liveOne(p: Position, quote: Quote | undefined, now: number): Position {
  const freshness = quote ? priceFreshness(quote.t, now, marketBySymbol(p.coin)?.maxPriceAgeSec ?? 0) : ''
  const cfg = configStore.get().cfg, hit = cache.get(p)
  if (hit && hit.quote === quote && hit.freshness === freshness && hit.cfg === cfg) return hit.out
  const out = livePos(p, quote, now)
  cache.set(p, { quote, freshness, cfg, out })
  return out
}

/** Positions valued at `quotes` (aligned by index). Unchanged positions keep their object and the list its reference. */
export function livePositions(positions: Position[], quotes: Quotes, now = serverNow()): Position[] {
  const out = positions.map((p, i) => liveOne(p, quotes[i], now))
  if (last && last.positions === positions && sameList(last.out, out)) return last.out
  last = { positions, out }
  return out
}

export function useLivePositions(positions: Position[], now?: number): Position[] {
  const coins = useMemo(() => positions.map(p => p.coin), [positions])
  const quotes = useQuotes(coins)
  return livePositions(positions, quotes, now ?? serverNow())
}

/** The account valued at the displayed prices: open PnL and equity move by the difference between each loaded
 *  position's live PnL and the backend's valuation of it. A position without a live PnL keeps the backend's. */
export function useDisplayAccount(account: Account | null | undefined, positions: Position[]): Account | null | undefined {
  const live = useLivePositions(positions)
  if (!account) return account
  let delta = 0
  live.forEach((p, i) => { const was = positions[i].pnl; if (p.pnl != null && was != null) delta += p.pnl - was })
  if (!delta) return account
  return { ...account, openPnl: account.openPnl == null ? null : account.openPnl + delta, equity: account.equity == null ? null : account.equity + delta }
}
