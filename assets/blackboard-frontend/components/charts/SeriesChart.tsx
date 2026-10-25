import { useEffect, useRef, useState } from 'react'
import {
  AreaSeries,
  createChart,
  HistogramSeries,
  LastPriceAnimationMode,
  LineSeries,
  LineType,
  type IChartApi,
  type ISeriesApi,
  type SeriesType,
  type MouseEventParams,
} from 'lightweight-charts'
import { baseOptions, C, rangeMs, toSec, usdAxis } from './lw'
import { fmtUsd } from '../../lib/format'

export interface SeriesSpec {
  kind: 'area' | 'line' | 'histogram'
  data: { t: number; v: number }[]
  color?: string
  fill?: string
  fill2?: string
  width?: 1 | 2 | 3
  stepped?: boolean
  /** Last-value tag on the axis; off by default, the card's header chip already shows it. */
  label?: boolean
  /** Toggled off in the legend: kept (stable series) but not drawn nor autoscaled. */
  hidden?: boolean
  /** Name in the hover tooltip. */
  name?: string
}

/** Fit all points with enough empty bars at both ends that the edge time labels are not clipped. */
function fitPadded(chart: IChartApi, bars: number): Range | null {
  const ts = chart.timeScale()
  const w = ts.width()
  if (bars < 2 || w < 120) { ts.fitContent(); return null }
  const pad = (EDGE_PX * (bars - 1)) / (w - 2 * EDGE_PX)
  const range = { from: -pad, to: bars - 1 + pad }
  ts.setVisibleLogicalRange(range)
  return range
}
const EDGE_PX = 28

/** A flat or near-flat series gets a ±5% band (at least ±1), so axis ticks never repeat one rounded value. */
type Autoscale = { priceRange: { minValue: number; maxValue: number } | null } | null
const widenFlat = (base: () => Autoscale): Autoscale => {
  const r = base()
  if (!r?.priceRange) return r
  const { minValue: lo, maxValue: hi } = r.priceRange
  const mid = (lo + hi) / 2, half = Math.max(Math.abs(mid) * 0.05, 1)
  return hi - lo >= half ? r : { ...r, priceRange: { minValue: mid - half, maxValue: mid + half } }
}
type Range = { from: number; to: number }

/** At most this many slots on the window's grid, so every bar keeps a pixel or two even in a narrow card. */
const MAX_SLOTS = 360
/** The window's even grid (seconds): from `now - range` (or the first point for "all") to now, on the data's own bucket
 *  (median gap: a live end point seconds after the last snapshot does not count), coarsened to at most MAX_SLOTS slots. */
function windowGrid(times: number[], range: string | undefined, now: number): { start: number; end: number; step: number } | null {
  if (times.length === 0) return null
  const sorted = [...times].sort((a, b) => a - b)
  const len = rangeMs(range)
  const end = Math.floor(now / 1000), start = len ? end - len / 1000 : sorted[0]
  if (end <= start) return null
  const gaps = sorted.slice(1).map((t, i) => t - sorted[i]).filter((g) => g > 0).sort((a, b) => a - b)
  let step = gaps.length ? gaps[gaps.length >> 1] : Math.round((end - start) / 48)
  step = Math.max(step, Math.ceil((end - start) / MAX_SLOTS), 1)
  return { start, end, step }
}
/** Empty slots on the grid away from real points. The axis is index based, so only an even grid keeps time linear. */
function windowSlots(times: number[], g: { start: number; end: number; step: number }): number[] {
  const sorted = [...times].sort((a, b) => a - b), out: number[] = []
  const anchor = sorted[sorted.length - 1]
  for (let t = anchor - Math.floor((anchor - g.start) / g.step) * g.step; t <= g.end; t += g.step)
    if (!sorted.some((p) => Math.abs(p - t) < g.step / 2)) out.push(t)
  return out
}
type Pt = { time: ReturnType<typeof toSec>; value: number }
/** A line over the whole window: 0 before its first point (nothing existed yet), and its last value held up to now. */
function padLine(d: Pt[], g: { start: number; end: number; step: number }): Pt[] {
  if (!d.length) return d
  const first = d[0].time, last = d[d.length - 1]
  const head: Pt[] = first - g.step > g.start ? [{ time: g.start as Pt['time'], value: 0 }, { time: (first - g.step) as Pt['time'], value: 0 }] : []
  const tail: Pt[] = g.end - last.time >= g.step ? [{ time: g.end as Pt['time'], value: last.value }] : []
  return [...head, ...d, ...tail]
}

function prep(d: { t: number; v: number }[]) {
  const out: { time: ReturnType<typeof toSec>; value: number }[] = []
  for (const p of [...d].sort((a, b) => a.t - b.t)) {
    if (!Number.isFinite(p.v)) continue
    const s = toSec(p.t)
    const last = out[out.length - 1]
    if (last && last.time === s) last.value = p.v
    else out.push({ time: s, value: p.v })
  }
  return out
}

interface TipRow { name: string; color: string; value: number }
interface Tip { x: number; y: number; t: number; rows: TipRow[] }
const pad2 = (n: number) => String(n).padStart(2, '0')
const tipDate = (ms: number) => { const d = new Date(ms); return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()} ${pad2(d.getHours())}:${pad2(d.getMinutes())}` }

/** Floating hover card beside the crosshair, kept inside the chart. */
function ChartTip({ tip, fmt, host }: { tip: Tip; fmt: (n: number) => string; host: HTMLDivElement | null }) {
  const w = host?.clientWidth ?? 0, h = host?.clientHeight ?? 0
  const W = 190, gap = 14
  const left = tip.x + gap + W > w ? Math.max(0, tip.x - gap - W) : tip.x + gap
  const top = Math.min(Math.max(0, tip.y - 20), Math.max(0, h - 30 - tip.rows.length * 22))
  return <div className="ui-chart-tip" style={{ left, top, minWidth: W }} aria-hidden>
    <div className="ui-chart-tip-t">{tipDate(tip.t)}</div>
    {tip.rows.map((r, i) => <div key={i} className="ui-chart-tip-row">
      {tip.rows.length > 1 && <i style={{ background: r.color }} />}<span>{r.name}</span><b>{fmt(r.value)}</b>
    </div>)}
  </div>
}

/** Generic time-series chart (lightweight-charts) used by House/Paper/Portfolio/Stats cards. */
export function SeriesChart({
  series,
  fmt = usdAxis,
  liveKey = 0,
  watermark = false,
  topMargin = 0.18,
  integer = false,
  valueFmt,
  range,
}: {
  series: SeriesSpec[]
  fmt?: (n: number) => string
  liveKey?: number
  watermark?: boolean
  topMargin?: number
  /** Counts: whole-number ticks only. */
  integer?: boolean
  /** Tooltip value format (default: full USD for the USD axis, else the axis format). */
  valueFmt?: (n: number) => string
  /** The card's range key ("1h", "1d", "7d", "30d", "all"): the axis spans the whole window, see `windowSlots`. */
  range?: string
}) {
  const host = useRef<HTMLDivElement>(null)
  const [tip, setTip] = useState<Tip | null>(null)
  const seriesRef = useRef(series)
  seriesRef.current = series
  const fmtRef = useRef<(n: number) => string>(fmtUsd)
  fmtRef.current = valueFmt ?? (fmt === usdAxis ? (n: number) => fmtUsd(n) : fmt)
  const chartRef = useRef<IChartApi | null>(null)
  const sref = useRef<ISeriesApi<SeriesType>[]>([])
  /** Holds only the window's empty slots: whitespace inside a drawn series would break its line. */
  const axisRef = useRef<ISeriesApi<'Line'> | null>(null)
  const barsRef = useRef(0)
  const fitted = useRef<Range | null>(null)
  const syncAxis = useRef(() => {})
  const fit = (chart: IChartApi, bars: number) => { fitted.current = fitPadded(chart, bars) }
  const following = (chart: IChartApi) => {
    const r = chart.timeScale().getVisibleLogicalRange(), f = fitted.current
    return !f || !r || (Math.abs(r.from - f.from) <= 0.5 && Math.abs(r.to - f.to) <= 0.5)
  }
  const shape = series.map((s) => s.kind + (s.color || '')).join('|')

  useEffect(() => {
    if (!host.current) return
    const chart = createChart(host.current, baseOptions({ price: fmt }))
    // Analytics live inside long pages: a vertical swipe/wheel must scroll the
    // page. Keep horizontal inspection and pinch zoom without trapping readers.
    chart.applyOptions({
      handleScroll: { mouseWheel: false, vertTouchDrag: false, horzTouchDrag: true, pressedMouseMove: true },
      handleScale: { mouseWheel: false, pinch: true },
    })
    // entireTextOnly: no half-clipped tick at the top or bottom edge.
    chart.priceScale('right').applyOptions({ scaleMargins: { top: topMargin, bottom: 0.06 }, entireTextOnly: true })
    chartRef.current = chart
    axisRef.current = chart.addSeries(LineSeries, { visible: false, priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false })
    // Inside a ChartCard the card draws the axis separator over its full height, so it needs the axis width.
    const card = host.current.closest<HTMLElement>('.ui-chart')
    let frame = 0
    if (card) {
      chart.priceScale('right').applyOptions({ borderVisible: false })
      card.classList.add('has-axis')
      syncAxis.current = () => {
        cancelAnimationFrame(frame)
        frame = requestAnimationFrame(() => card.style.setProperty('--ui-chart-axis', chart.priceScale('right').width() + 'px'))
      }
    }
    // Hover tooltip: date on top, then each visible line's name and value at that time (the axis time label is hidden).
    chart.applyOptions({ crosshair: { vertLine: { labelVisible: false } } })
    const onMove = (param: MouseEventParams) => {
      const t = param.time, pt = param.point
      if (t === undefined || !pt || pt.x < 0 || pt.y < 0) { setTip(null); return }
      const rows: TipRow[] = []
      const ms = (t as number) * 1000
      seriesRef.current.forEach((spec) => {
        if (spec.hidden) return
        // the line's value at that time: its last point at or before it (lines need not share timestamps)
        let v: number | null = null
        for (const p of spec.data) { if (p.t <= ms + 999 && Number.isFinite(p.v)) v = p.v; else if (p.t > ms + 999) break }
        if (v !== null) rows.push({ name: spec.name ?? '', color: spec.color || C.ink, value: v })
      })
      if (!rows.length) { setTip(null); return }
      setTip({ x: pt.x, y: pt.y, t: ms, rows })
    }
    chart.subscribeCrosshairMove(onMove)
    // A resize refits only while the view is still the fitted one, so a pan or pinch zoom survives it.
    const refit = () => { if (following(chart)) fit(chart, barsRef.current); syncAxis.current() }
    chart.timeScale().subscribeSizeChange(refit)
    return () => {
      chart.timeScale().unsubscribeSizeChange(refit)
      chart.unsubscribeCrosshairMove(onMove)
      cancelAnimationFrame(frame)
      syncAxis.current = () => {}
      card?.classList.remove('has-axis')
      card?.style.removeProperty('--ui-chart-axis')
      chart.remove()
      chartRef.current = null
      axisRef.current = null
      sref.current = []
    }
    // chart is created once; fmt/topMargin changes are applied below
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    chartRef.current?.applyOptions({ localization: { priceFormatter: fmt } })
    chartRef.current?.priceScale('right').applyOptions({ scaleMargins: { top: topMargin, bottom: 0.06 } })
  }, [fmt, topMargin])

  useEffect(() => {
    const chart = chartRef.current
    if (!chart) return
    const made: ISeriesApi<SeriesType>[] = series.map((s, i) => {
      const color = s.color || C.ink
      const pf = { type: 'custom' as const, formatter: fmt, minMove: integer ? 1 : 0.01 }
      const autoscale = { autoscaleInfoProvider: widenFlat }
      if (s.kind === 'histogram') return chart.addSeries(HistogramSeries, { color, priceFormat: pf, priceLineVisible: false, lastValueVisible: s.label ?? false, ...autoscale })
      if (s.kind === 'line')
        return chart.addSeries(LineSeries, {
          color,
          lineWidth: s.width ?? 2,
          lineType: s.stepped ? LineType.WithSteps : LineType.Simple,
          priceFormat: pf,
          priceLineVisible: false,
          lastValueVisible: s.label ?? false,
          crosshairMarkerRadius: 3,
          ...autoscale,
        })
      return chart.addSeries(AreaSeries, {
        lineColor: color,
        lineWidth: s.width ?? 2,
        topColor: s.fill ?? 'rgba(242,240,230,0.10)',
        bottomColor: s.fill2 ?? s.fill ?? 'rgba(242,240,230,0.02)',
        lineType: s.stepped ? LineType.WithSteps : LineType.Simple,
        priceFormat: pf,
        priceLineVisible: false,
        lastValueVisible: s.label ?? false,
        lastPriceAnimation: i === 0 ? LastPriceAnimationMode.OnDataUpdate : LastPriceAnimationMode.Disabled,
        ...autoscale,
      })
    })
    sref.current = made
    return () => {
      for (const s of made) {
        try {
          chart.removeSeries(s)
        } catch {
          /* gone */
        }
      }
      sref.current = []
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shape, fmt, integer])

  useEffect(() => {
    const chart = chartRef.current
    // A poll refits only while the view is still the fitted one; re-created series start empty, so they refit too.
    const follow = !!chart && following(chart)
    const times = new Set<number>()
    const prepped = series.map((s) => prep(s.data))
    prepped.forEach((d) => d.forEach((x) => times.add(x.time)))
    // Lines are padded over the window (0 before the first point, the last value up to now); time-only items on the hidden
    // axis series fill the rest of the grid, so the shared time axis spans the window evenly.
    const grid = range ? windowGrid([...times], range, Date.now()) : null
    const drawn = series.map((s, i) => (grid && s.kind !== 'histogram' ? padLine(prepped[i], grid) : prepped[i]))
    drawn.forEach((d) => d.forEach((x) => times.add(x.time)))
    const slots = grid ? windowSlots([...times], grid) : []
    axisRef.current?.setData(slots.map((t) => ({ time: t as ReturnType<typeof toSec> })))
    series.forEach((s, i) => {
      const api = sref.current[i]
      if (!api) return
      api.setData(s.kind === 'histogram' ? drawn[i].map((x) => ({ ...x, color: s.color })) : drawn[i])
    })
    slots.forEach((t) => times.add(t))
    // A new bar count (another range, or the grid's step changed) always refits: the old view no longer means anything.
    const reshaped = times.size !== barsRef.current
    barsRef.current = times.size
    if (chart && (follow || reshaped)) fit(chart, times.size)
    syncAxis.current()
  }, [series, shape, fmt, integer, range])

  useEffect(() => {
    if (liveKey && chartRef.current) fit(chartRef.current, barsRef.current)
  }, [liveKey])

  const visible = series.map((s) => !s.hidden).join('|')
  useEffect(() => {
    series.forEach((s, i) => sref.current[i]?.applyOptions({ visible: !s.hidden }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, shape])

  return (
    <>
      {watermark && (
        <div className="chart-wm" aria-hidden style={{ fontSize: 96 }}>
          <span style={{ transform: 'none' }}>Blackboard</span>
        </div>
      )}
      <div className="chart-host" ref={host} />
      {tip && <ChartTip tip={tip} fmt={fmtRef.current} host={host.current} />}
    </>
  )
}
