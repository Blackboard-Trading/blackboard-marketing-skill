import { useEffect, useMemo, useRef, useState } from 'react'
import { CandlestickSeries, HistogramSeries, createChart, createSeriesMarkers, LineStyle, type IChartApi, type IPriceLine, type ISeriesApi, type ISeriesMarkersPluginApi, type Time } from 'lightweight-charts'
import { alignFillTimes, type Fill } from '../../lib/fills'
import { getCandles } from '../../lib/data'
import { chartCoin, priceDecimals } from '../../lib/config'
import { priceStreamMarket, priceStreamStore, retainPriceStream, retryPriceStream } from '../../lib/price-stream'
import { chartCandle, streamFreshness, streamPrice } from '../../lib/price-stream-state'
import { useStore } from '../../lib/store'
import { openModal } from '../../lib/toast'
import { walletStore } from '../../lib/wallet'
import { intervalMs } from '../../lib/intervals'
import { HL_INTERVALS, hlCandles, hlSpotCoin, spotUsd } from '../../lib/hl'
import { hlSubscribeCandle } from '../../lib/hlws'
import { onTick } from '../../lib/chart-ticks'
import type { Candle, Position } from '../../lib/types'
import { baseOptions, C, rgba, toSec } from './lw'
import { TICK_GUTTER, TickChart } from './TickChart'
import { LoadingState } from '../LoadingState'
import { Button, PHONE } from '../primitives'

const usdBar = <K extends { o: number; h: number; l: number; c: number }>(k: K): K => ({ ...k, o: spotUsd(k.o), h: spotUsd(k.h), l: spotUsd(k.l), c: spotUsd(k.c) })

/** While the history came from the backend, Hyperliquid candles are tried again this often. */
const HL_RETRY_MS = 30_000

const fmtAxis = (dp: number) => (p: number) => p.toLocaleString('en-US', { minimumFractionDigits: dp, maximumFractionDigits: dp })

/** onAxisWidth: the right price axis width (px) whenever it changes, so overlays stay clear of it. */
type Props = { coin: string; interval: string; positions: Position[]; liveKey: number; spanMs?: number; fills?: Fill[]; onAxisWidth?: (px: number) => void }

/** Display-only chart; mapped markets share the board's price stream, others retain the legacy source. */
export function TradeChart(props: Props) {
  const { interval, onAxisWidth } = props
  const ticks = useStore(priceStreamStore, s => s.symbol === props.coin && priceStreamMarket(props.coin) ? s.board.data.ticks : null)
  const fills = useMemo(() => ticks && props.fills ? alignFillTimes(props.fills, ticks) : props.fills, [props.fills, ticks])
  useEffect(() => { if (interval === 'Tick') onAxisWidth?.(TICK_GUTTER) }, [interval, onAxisWidth])
  useEffect(() => retainPriceStream(props.coin, interval), [props.coin, interval])
  return <>
    {interval === 'Tick' ? <TickChart coin={props.coin} positions={props.positions} liveKey={props.liveKey} spanMs={props.spanMs} fills={fills} /> : <CandleChart {...props} fills={fills} />}
    {priceStreamMarket(props.coin) && <PriceStreamStatus coin={props.coin} interval={interval} />}
  </>
}

function CandleChart({ coin, interval, positions, liveKey, fills = [], onAxisWidth }: Props) {
  const host = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null)
  const markersRef = useRef<ISeriesMarkersPluginApi<Time> | null>(null)
  const syncAxis = useRef(() => {})
  // A ref, so a changing callback never rebuilds the chart.
  const axisCb = useRef(onAxisWidth)
  useEffect(() => { axisCb.current = onAxisWidth }, [onAxisWidth])
  const firstBar = useRef<number>(Infinity)
  const [loading, setLoading] = useState(true)
  const [historyError, setHistoryError] = useState(false)
  const [empty, setEmpty] = useState(false)
  const [retry, setRetry] = useState(0)
  const [rev, setRev] = useState(0)
  const dp = priceDecimals(coin)

  // chart lifetime
  useEffect(() => {
    if (!host.current) return
    const chart = createChart(host.current, baseOptions({ seconds: false, price: fmtAxis(dp) }))
    // On phones the chart sits above the order form: a vertical swipe scrolls the page.
    chart.applyOptions({ handleScroll: { vertTouchDrag: false } })
    chartRef.current = chart
    // The price axis widens or narrows with its labels; the series re-reads it after each paint.
    let axisW = 0
    syncAxis.current = () => { const w = chart.priceScale('right').width(); if (w > 0 && w !== axisW) { axisW = w; axisCb.current?.(w) } }
    const first = requestAnimationFrame(() => syncAxis.current())
    return () => {
      cancelAnimationFrame(first)
      syncAxis.current = () => {}
      markersRef.current?.detach()
      markersRef.current = null
      chart.remove()
      chartRef.current = null
      seriesRef.current = null
    }
  }, [dp])

  // series per coin/interval
  useEffect(() => {
    const chart = chartRef.current
    if (!chart) return
    let alive = true
    setLoading(true)
    setHistoryError(false)
    setEmpty(false)
    chart.applyOptions({
      ...baseOptions({ seconds: false, price: fmtAxis(dp) }),
      timeScale: { secondsVisible: intervalMs(interval) < 60_000, barSpacing: 7, rightOffset: 8, timeVisible: true },
    })
    let raf = 0
    const priceFormat = { type: 'price' as const, precision: dp, minMove: 10 ** -dp }
    const s = chart.addSeries(CandlestickSeries, {
      upColor: C.pos,
      downColor: C.neg,
      wickUpColor: C.pos,
      wickDownColor: C.neg,
      borderVisible: false,
      priceLineVisible: true,
      priceLineStyle: LineStyle.Dotted,
      priceFormat,
    })
    seriesRef.current = s
    markersRef.current = createSeriesMarkers(s, [])
    // Market volume (Hyperliquid; fill volume on the backend backup) at 18% on its own scale, bottom fifth of the pane. Hidden on narrow screens.
    const showVol = !window.matchMedia(PHONE).matches
    const vol = showVol ? chart.addSeries(HistogramSeries, { priceScaleId: 'vol', priceFormat: { type: 'volume' }, lastValueVisible: false, priceLineVisible: false }) : null
    vol?.priceScale().applyOptions({ scaleMargins: { top: 0.8, bottom: 0 } })
    const volBar = (k: Candle) => ({ time: toSec(k.t), value: k.v || 0, color: k.c >= k.o ? rgba(C.pos, 0.18) : rgba(C.neg, 0.18) })
    if (priceStreamMarket(coin)) {
      let first = true
      let reset = -1
      let seen: object | null = null
      let backupLine: IPriceLine | null = null
      const paintStream = () => {
        const state = priceStreamStore.get()
        if (state.symbol !== coin) return
        const data = state.board.data
        if (seen === state.board) return
        seen = state.board
        if (backupLine) { s.removePriceLine(backupLine); backupLine = null }
        const backup = state.board.backup
        if (backup && streamFreshness({ ...data, latest: backup.tick, sourceStatus: backup.sourceStatus }, Date.now(), priceStreamMarket(coin)!.staleAfterMs) === 'live') backupLine = s.createPriceLine({ price: streamPrice(backup.tick.priceRaw, backup.tick.priceScale), title: 'Backup', color: C.muted, lineStyle: LineStyle.Dashed, axisLabelVisible: true })
        const rows = (data.candles[interval] ?? []).map(chartCandle)
        s.setData(rows.map(k => ({ time: toSec(k.t), open: k.o, high: k.h, low: k.l, close: k.c })))
        const volumeKnown = rows.length > 0 && rows.every(k => k.v !== null)
        vol?.applyOptions({ visible: volumeKnown })
        vol?.setData(volumeKnown ? rows.map(volBar) : [])
        const firstChanged = firstBar.current !== (rows[0]?.t ?? Infinity)
        firstBar.current = rows[0]?.t ?? Infinity
        if (firstChanged) setRev(r => r + 1)
        setLoading(!data.cursor)
        setEmpty(!!data.cursor && !rows.length)
        if (first || reset !== data.reset) {
          chart.timeScale().scrollToRealTime()
          setRev(r => r + 1)
          first = false
          reset = data.reset
        }
        syncAxis.current()
      }
      const stop = priceStreamStore.subscribe(paintStream)
      paintStream()
      return () => {
        alive = false
        stop()
        if (chartRef.current === chart) {
          markersRef.current?.detach()
          chart.removeSeries(s)
          if (vol) chart.removeSeries(vol)
        }
        markersRef.current = null
        seriesRef.current = null
      }
    }
    const iv = intervalMs(interval)
    let last: Candle | null = null
    let dirty = false
    const paint = () => {
      raf = 0
      if (!alive || !last || !dirty) return
      dirty = false
      s.update({ time: toSec(last.t), open: last.o, high: last.h, low: last.l, close: last.c })
      vol?.update(volBar(last))
      syncAxis.current()
    }
    const schedule = () => {
      dirty = true
      if (!raf) raf = requestAnimationFrame(paint)
    }
    let lastMid = 0
    let lastMidAt = 0
    let fromHl = false
    let unCandle = () => {}
    let hlRetry: ReturnType<typeof setTimeout> | undefined
    // Rebuilds the series from Hyperliquid once it serves candles again; until then the backend history stays.
    const retryHl = () => {
      hlRetry = setTimeout(() => {
        void hlSpotCoin(chartCoin(coin)).then((spot) => hlCandles(spot, interval, 2)).then(
          (cs) => { if (alive) { if (cs.length) setRetry((n) => n + 1); else retryHl() } },
          () => { if (alive) retryHl() },
        )
      }, HL_RETRY_MS)
    }
    void hlSpotCoin(chartCoin(coin))
      .then((spot) => hlCandles(spot, interval, 300).then((cs) => {
        if (!cs.length) throw Error('no HL candles')
        fromHl = true
        if (alive && HL_INTERVALS.has(interval)) unCandle = hlSubscribeCandle(spot, interval, (k) => onCandle(usdBar(k)))
        return cs.map(usdBar)
      }))
      .catch(() => getCandles(coin, interval, 300))
      .then((cs) => {
        if (!alive) return
        const sorted = [...cs].sort((a, b) => a.t - b.t)
        s.setData(sorted.map((k) => ({ time: toSec(k.t), open: k.o, high: k.h, low: k.l, close: k.c })))
        vol?.setData(sorted.map(volBar))
        last = sorted[sorted.length - 1] ?? null
        firstBar.current = sorted[0]?.t ?? Infinity
        chart.timeScale().scrollToRealTime()
        requestAnimationFrame(() => syncAxis.current())
        setLoading(false)
        setEmpty(cs.length === 0)
        setRev((r) => r + 1)
        if (!fromHl) retryHl()
      }).catch(() => { if (alive) { setLoading(false); setHistoryError(true) } })
    // HL candle stream (only when the history came from HL): authoritative open/high/low/volume; the close follows
    // the live mid.
    function onCandle(k: { t: number; o: number; h: number; l: number; c: number; v: number }) {
      if (!alive || !fromHl || !last || k.t < last.t) return
      const midFresh = lastMid > 0 && Date.now() - lastMidAt < 2000
      const c = midFresh ? lastMid : k.c
      const sameBar = k.t === last.t
      last = { t: k.t, o: k.o, h: Math.max(k.h, c, sameBar ? last.h : -Infinity), l: Math.min(k.l, c, sameBar ? last.l : Infinity), c, v: k.v }
      schedule()
    }
    const unTick = onTick((cn, t) => {
      if (cn !== coin || !alive) return
      lastMid = t.p
      lastMidAt = Date.now()
      setEmpty(false)
      setHistoryError(false)
      if (!last) last = { t: Math.floor(t.t / iv) * iv, o:t.p, h:t.p, l:t.p, c:t.p, v:0 }
      if (t.t >= last.t + iv) {
        const start = Math.floor(t.t / iv) * iv
        last = { t: start, o: last.c, h: Math.max(last.c, t.p), l: Math.min(last.c, t.p), c: t.p, v: 0 }
      } else {
        last = { ...last, h: Math.max(last.h, t.p), l: Math.min(last.l, t.p), c: t.p }
      }
      schedule()
    })
    return () => {
      alive = false
      clearTimeout(hlRetry)
      if (raf) cancelAnimationFrame(raf)
      unCandle()
      unTick()
      if (chartRef.current) {
        try {
          chartRef.current.removeSeries(s)
          if (vol) chartRef.current.removeSeries(vol)
        } catch {
          /* chart gone */
        }
      }
      markersRef.current = null
      seriesRef.current = null
    }
  }, [coin, interval, dp, retry])

  // your fills: B below the bar, S above it (bucketed to the candle that contains the fill)
  useEffect(() => {
    const mk = markersRef.current
    if (!mk) return
    const iv = intervalMs(interval)
    const t0 = Number.isFinite(firstBar.current) ? firstBar.current : Date.now() - iv * 2
    mk.setMarkers(fills.filter((f) => f.t >= t0 && f.t <= Date.now() + iv).map((f) => ({ time: toSec(Math.floor(f.t / iv) * iv) as Time, position: f.buy ? 'belowBar' as const : 'aboveBar' as const, color: f.buy ? C.pos : C.neg, shape: f.buy ? 'arrowUp' as const : 'arrowDown' as const, text: f.buy ? 'B' : 'S' })))
  }, [fills, interval, rev])

  // live button → scroll to realtime
  useEffect(() => {
    if (liveKey) chartRef.current?.timeScale().scrollToRealTime()
  }, [liveKey])

  // position lines
  useEffect(() => {
    const s = seriesRef.current
    if (!s) return
    const lines: IPriceLine[] = []
    for (const p of positions.filter((x) => x.coin === coin)) {
      const col = p.isLong ? C.pos : C.neg
      if (p.entry !== null) lines.push(
        s.createPriceLine({
          price: p.entry,
          color: col,
          lineWidth: 1,
          lineStyle: LineStyle.Dashed,
          axisLabelVisible: true,
          axisLabelColor: col,
          axisLabelTextColor: p.isLong ? C.posInk : C.negInk,
          title: `${p.isLong ? 'L' : 'S'} ${p.leverage}×`,
        }),
      )
      if (p.bust !== null) lines.push(
        s.createPriceLine({
          price: p.bust,
          color: rgba(C.neg, 0.85),
          lineWidth: 1,
          lineStyle: LineStyle.SparseDotted,
          axisLabelVisible: true,
          axisLabelColor: C.liq,
          axisLabelTextColor: C.ink,
          title: 'LIQ',
        }),
      )
    }
    return () => {
      for (const l of lines) {
        try {
          s.removePriceLine(l)
        } catch {
          /* series gone */
        }
      }
    }
  }, [positions, coin, rev])

  return (
    <>
      <div className="chart-host tr-chart-host" ref={host} />
      {loading && <div className="tr-chart-loading"><LoadingState shape="chart" label={`Loading ${coin} ${interval} candles…`} /></div>}
      {!loading && (historyError || empty) && <div className="tr-chart-state" role="status"><span>{historyError ? 'Price history unavailable' : 'No price history for this range yet'}</span>{historyError && <Button size="sm" onClick={() => setRetry(n => n + 1)}>Retry chart</Button>}</div>}
    </>
  )
}

function PriceStreamStatus({ coin, interval }: { coin: string; interval: string }) {
  const { symbol, board, now } = useStore(priceStreamStore)
  const market = priceStreamMarket(coin)!
  const freshness = streamFreshness(board.data, now, market.staleAfterMs)
  const coverage = board.data.status[interval]
  const backup = board.backup && streamFreshness({ ...board.data, latest: board.backup.tick, sourceStatus: board.backup.sourceStatus }, now, market.staleAfterMs) === 'live'
  const label = symbol !== coin ? 'Connecting chart' : board.connection === 'session-required' ? board.error
    : backup ? 'Backup · Chainlink REST'
    : board.connection === 'recovering' && freshness === 'live' ? 'Chart history is syncing'
    : board.connection !== 'open' ? (board.error ?? 'Connecting chart')
    : freshness === 'stale' ? 'Chart price is stale' : freshness === 'warming' ? 'Chart is warming up'
    : coverage && !coverage.depthReady ? 'Chart history is warming up' : null
  if (!label) return null
  return <div className="tr-price-stream-status" role="status">
    <span>{label}</span>
    {board.connection === 'session-required' && <Button size="sm" onClick={() => openModal(walletStore.get().address ? 'session' : 'connect')}>Enable chart</Button>}
    {board.connection === 'offline' && <Button size="sm" onClick={retryPriceStream}>Retry chart</Button>}
  </div>
}
