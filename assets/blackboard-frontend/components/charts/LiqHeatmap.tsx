import { useEffect, useRef, type KeyboardEvent } from 'react'
import {
  CandlestickSeries,
  createChart,
  LineStyle,
  type IChartApi,
  type IPrimitivePaneRenderer,
  type IPrimitivePaneView,
  type ISeriesApi,
  type ISeriesPrimitive,
  type MouseEventParams,
  type SeriesAttachedParameter,
  type Time,
} from 'lightweight-charts'
import { LoadingState } from '../LoadingState'
import { fmtCompactUsd, fmtPrice, fmtUsd } from '../../lib/format'
import type { Candle, LiqMap } from '../../lib/types'
import { baseOptions, C, rgba, toSec } from './lw'

type Target = Parameters<IPrimitivePaneRenderer['draw']>[0]
type Band = { lo: number; hi: number; long: number; short: number; fill: string }

const WICK = rgba(C.ink, 0.45)

/** Teal → green → yellow, brighter and more opaque with notional (square-root scale). */
function heat(x: number): string {
  const t = Math.sqrt(Math.max(0, Math.min(1, x)))
  const a = t < 0.5 ? [50, 108, 135] : [72, 167, 129]
  const b = t < 0.5 ? [72, 167, 129] : [229, 197, 63]
  const f = t < 0.5 ? t * 2 : (t - 0.5) * 2
  return `rgba(${a.map((v, i) => Math.round(v + (b[i] - v) * f)).join(',')},${(0.08 + t * 0.52).toFixed(3)})`
}

const HEAT_GRADIENT = `linear-gradient(90deg, ${Array.from({ length: 21 }, (_, i) => `${heat(i / 20)} ${i * 5}%`).join(', ')})`

const notional = (m: LiqMap) => m.bins.map((b) => b.longNotional + b.shortNotional)

/** Legend: $0 → brightest band. */
export function LiqScale({ map, className = '' }: { map: LiqMap | null | undefined; className?: string }) {
  const peak = map ? Math.max(0, ...notional(map)) : null
  if (peak === 0) return null // nothing to scale
  return (
    <span
      className={'pm-heat-scale ' + className}
      title={`Liquidation notional per price band, long + short combined. Colour shows size, not direction.${peak !== null ? ` Brightest band: ${fmtUsd(peak)}.` : ''}`}
    >
      <span className="ui-sr-only">Band colour scale, long + short liquidation notional, from </span>
      <span>$0</span>
      <i aria-hidden style={{ background: peak ? HEAT_GRADIENT : heat(0) }} />
      <span className="ui-sr-only"> to </span>
      <span>{peak !== null ? fmtCompactUsd(peak) : '--'}</span>
    </span>
  )
}

class HeatBands implements ISeriesPrimitive<Time> {
  private series: ISeriesApi<'Candlestick'> | null = null
  private request: (() => void) | null = null
  bands: Band[] = []
  range: { min: number; max: number } | null = null
  hover = -1
  attached(p: SeriesAttachedParameter<Time>) {
    this.series = p.series as ISeriesApi<'Candlestick'>
    this.request = p.requestUpdate
  }
  detached() {
    this.series = null
  }
  setMap(m: LiqMap | null) {
    const bins = m ? [...m.bins].sort((a, b) => a.price - b.price) : []
    const max = Math.max(1, ...(m ? notional(m) : [1]))
    this.bands = bins.length < 2 ? [] : bins.map((b, i) => ({
      lo: i > 0 ? (bins[i - 1].price + b.price) / 2 : b.price - (bins[1].price - bins[0].price) / 2,
      hi: i < bins.length - 1 ? (bins[i + 1].price + b.price) / 2 : b.price + (b.price - bins[i - 1].price) / 2,
      long: b.longNotional,
      short: b.shortNotional,
      fill: heat((b.longNotional + b.shortNotional) / max),
    }))
    this.range = bins.length ? { min: bins[0].price, max: bins[bins.length - 1].price } : null
    this.hover = -1
    this.request?.()
  }
  /** Index of the band under `price`, -1 when none. */
  at(price: number) {
    const b = this.bands
    let lo = 0, hi = b.length - 1
    while (lo <= hi) {
      const mid = (lo + hi) >> 1
      if (price < b[mid].lo) hi = mid - 1
      else if (price >= b[mid].hi) lo = mid + 1
      else return mid
    }
    return -1
  }
  setHover(i: number) {
    if (i === this.hover) return
    this.hover = i
    this.request?.()
  }
  /** Merged with the candles' range, so every band stays on screen. */
  autoscaleInfo() {
    return this.range ? { priceRange: { minValue: this.range.min, maxValue: this.range.max } } : null
  }
  paneViews(): readonly IPrimitivePaneView[] {
    const self = this
    return [
      {
        zOrder: () => 'bottom',
        renderer: () => ({
          draw(target: Target) {
            const s = self.series
            if (!s || !self.bands.length) return
            target.useMediaCoordinateSpace(({ context: ctx, mediaSize }) => {
              for (let i = 0; i < self.bands.length; i++) {
                const b = self.bands[i]
                if (b.long + b.short <= 0) continue
                const y1 = s.priceToCoordinate(b.hi)
                const y2 = s.priceToCoordinate(b.lo)
                if (y1 === null || y2 === null) continue
                ctx.fillStyle = b.fill
                ctx.fillRect(0, Math.min(y1, y2), mediaSize.width, Math.max(1, Math.abs(y2 - y1)))
              }
              const h = self.bands[self.hover]
              const y1 = h && s.priceToCoordinate(h.hi)
              const y2 = h && s.priceToCoordinate(h.lo)
              if (y1 == null || y2 == null) return
              ctx.strokeStyle = rgba(C.ink, 0.55)
              ctx.lineWidth = 1
              ctx.strokeRect(0.5, Math.round(Math.min(y1, y2)) + 0.5, mediaSize.width - 1, Math.max(1, Math.round(Math.abs(y2 - y1)) - 1))
            })
          },
        }),
      },
    ]
  }
}

const spacing = (c: Candle[]) => (c.length > 1 ? c[1].t - c[0].t : 0)

/** Candles (Hyperliquid, else GET /v1/markets/:m/candles) over horizontal liquidation-notional bands (GET /v1/house/liquidations).
 * Ctrl/⌘ + wheel or pinch zooms, drag pans, double-click or 0 resets; plain wheel scrolls the page; the chart redraws only on data, size or hover-band change. */
export function LiqHeatmap({ candles, map, dp, label = 'Liquidation heatmap' }: { candles: Candle[] | undefined; map: LiqMap | null; dp: number; label?: string }) {
  const host = useRef<HTMLDivElement>(null)
  const tip = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const sref = useRef<ISeriesApi<'Candlestick'> | null>(null)
  const bands = useRef(new HeatBands())
  const fitted = useRef(0)

  useEffect(() => {
    const el = host.current
    if (!el) return
    const price = (p: number) => fmtPrice(p, dp)
    const chart = createChart(el, baseOptions({ price }))
    chart.applyOptions({
      grid: { horzLines: { color: rgba(C.ink, 0.12), style: LineStyle.Dotted } },
      rightPriceScale: { scaleMargins: { top: 0.06, bottom: 0.06 } },
      timeScale: { rightOffset: 4 },
      crosshair: {
        vertLine: { color: rgba(C.ink, 0.35), labelBackgroundColor: C.labelBg, style: LineStyle.Dashed },
        horzLine: { color: rgba(C.ink, 0.35), labelBackgroundColor: C.labelBg, style: LineStyle.Dashed },
      },
      handleScroll: { mouseWheel: false, pressedMouseMove: true, horzTouchDrag: true, vertTouchDrag: false },
      handleScale: { mouseWheel: false, pinch: true, axisPressedMouseMove: { time: true, price: true }, axisDoubleClickReset: true },
    })
    const s = chart.addSeries(CandlestickSeries, {
      upColor: 'rgba(0,0,0,0)',
      downColor: C.ink,
      borderUpColor: C.ink,
      borderDownColor: C.ink,
      wickUpColor: WICK,
      wickDownColor: WICK,
      priceLineVisible: true,
      priceLineStyle: LineStyle.Dashed,
      priceFormat: { type: 'price', precision: dp, minMove: dp === 1 ? 0.1 : 0.01 },
    })
    s.attachPrimitive(bands.current)
    chartRef.current = chart
    sref.current = s
    fitted.current = 0

    let box = { w: 0, h: 0, cw: 0, ch: 0 }
    const hide = () => {
      bands.current.setHover(-1)
      if (tip.current) tip.current.hidden = true
    }
    const onMove = (p: MouseEventParams<Time>) => {
      const t = tip.current
      const y = p.point?.y
      const pr = y === undefined ? null : s.coordinateToPrice(y)
      const i = pr === null ? -1 : bands.current.at(pr)
      const b = bands.current.bands[i]
      if (!t || !p.point || !b || b.long + b.short <= 0) return hide()
      if (i !== bands.current.hover || t.hidden) {
        const v = t.querySelectorAll('b')
        v[0].textContent = `$${price(b.lo)} – $${price(b.hi)}`
        v[1].textContent = fmtUsd(b.long + b.short)
        v[2].textContent = fmtUsd(b.long)
        v[3].textContent = fmtUsd(b.short)
        t.hidden = false
        box = { w: t.offsetWidth, h: t.offsetHeight, cw: el.clientWidth - chart.priceScale('right').width(), ch: el.clientHeight - chart.timeScale().height() }
      }
      bands.current.setHover(i)
      const x = p.point.x + 14 + box.w > box.cw ? p.point.x - 14 - box.w : p.point.x + 14
      const top = Math.max(8, Math.min(box.ch - box.h - 8, p.point.y + 14))
      t.style.transform = `translate3d(${Math.max(4, x)}px,${top}px,0)`
    }
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return
      const ts = chart.timeScale()
      const r = ts.getVisibleLogicalRange()
      const at = ts.coordinateToLogical(e.clientX - el.getBoundingClientRect().left)
      if (!r || at === null) return
      e.preventDefault()
      const f = Math.exp(Math.max(-1, Math.min(1, (e.deltaY * (e.deltaMode === 1 ? 33 : 1)) / 300)))
      ts.setVisibleLogicalRange({ from: at - (at - r.from) * f, to: at + (r.to - at) * f })
    }
    chart.subscribeCrosshairMove(onMove)
    el.addEventListener('mouseleave', hide)
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => {
      el.removeEventListener('wheel', onWheel)
      el.removeEventListener('mouseleave', hide)
      chart.unsubscribeCrosshairMove(onMove)
      chart.remove()
      chartRef.current = null
      sref.current = null
    }
  }, [dp])

  useEffect(() => {
    const s = sref.current
    if (!s) return
    const rows = [...(candles ?? [])].sort((a, b) => a.t - b.t)
    s.setData(rows.map((k) => ({ time: toSec(k.t), open: k.o, high: k.h, low: k.l, close: k.c })))
    const last = rows[rows.length - 1], prev = rows[rows.length - 2]
    s.applyOptions({ priceLineColor: last && prev && last.c < prev.c ? C.neg : C.pos })
    // Keep the user's zoom across polls; refit when the market or interval changes.
    const key = rows.length ? spacing(rows) || 1 : 0
    if (key && key !== fitted.current) {
      chartRef.current?.timeScale().fitContent()
      fitted.current = key
    }
  }, [candles, dp])

  useEffect(() => {
    bands.current.setMap(map)
    if (tip.current) tip.current.hidden = true
  }, [map, dp])

  const reset = () => {
    chartRef.current?.timeScale().fitContent()
    chartRef.current?.priceScale('right').applyOptions({ autoScale: true })
  }
  const onKey = (e: KeyboardEvent) => {
    const ts = chartRef.current?.timeScale()
    const r = ts?.getVisibleLogicalRange()
    if (!ts || !r) return
    const span = r.to - r.from
    const zoom = (f: number) => ts.setVisibleLogicalRange({ from: r.to - span * f, to: r.to })
    const pan = (d: number) => ts.setVisibleLogicalRange({ from: r.from + d, to: r.to + d })
    const act: Record<string, () => void> = {
      '+': () => zoom(0.8), '=': () => zoom(0.8), '-': () => zoom(1.25),
      ArrowLeft: () => pan(-span * 0.1), ArrowRight: () => pan(span * 0.1), '0': reset, Home: reset,
    }
    if (!act[e.key]) return
    e.preventDefault()
    act[e.key]()
  }

  return (
    <div className="pm-heat">
      <div
        className="pm-heat-host"
        ref={host}
        tabIndex={0}
        role="application"
        aria-roledescription="chart"
        aria-label={`${label}. Ctrl or ⌘ + scroll, pinch or +/- to zoom, drag or arrow keys to pan, double-click or 0 to reset.`}
        onDoubleClick={reset}
        onKeyDown={onKey}
      />
      <div className="pm-heat-tip" ref={tip} hidden aria-hidden>
        <span>Price</span><b />
        <span>Size</span><b />
        <span>Long</span><b />
        <span>Short</span><b />
      </div>
      {!candles ? <div className="pm-heat-msg"><LoadingState shape="chart" label="Loading candles…" /></div> : !candles.length && <div className="pm-heat-msg" role="status">No price history for this market yet.</div>}
    </div>
  )
}
