import {
  ColorType,
  CrosshairMode,
  LineStyle,
  TickMarkType,
  type DeepPartial,
  type ChartOptions,
  type Time,
  type UTCTimestamp,
} from 'lightweight-charts'
import { compact, fmtDateTime, fmtDayTick, fmtTime } from '../../lib/format'

/** Chart palette — mirrors styles/redesign/tokens.css. Canvas/lightweight-charts can't read CSS vars. */
export const C = {
  ink: '#f2f0e6', // --color-text-primary
  muted: '#85857e', // --color-text-secondary
  border: 'rgba(242,240,230,0.3)', // --color-line-divider
  grid: 'rgba(242,240,230,0.14)',
  pos: '#8ff0b0', // --color-data-up
  posText: '#8ff0b0',
  posInk: '#161412',
  neg: '#ed776a', // --color-data-down
  negInk: '#161412',
  liq: '#8e3049', // LIQ label background (chalk-white text on it)
  accent: '#ffb100', // --color-chalk-yellow
  panel: '#1a1c1d', // --color-bg-base
  raised: '#191c1d', // --color-board
  labelBg: '#333336', // --color-board-raised
}

/** '#rrggbb' + alpha -> 'rgba(r,g,b,a)' */
export function rgba(hex: string, a: number) {
  return `rgba(${parseInt(hex.slice(1, 3), 16)},${parseInt(hex.slice(3, 5), 16)},${parseInt(hex.slice(5, 7), 16)},${a})`
}

export const toSec = (ms: number) => Math.floor(ms / 1000) as UTCTimestamp
const timeMs = (t: Time) => (typeof t === 'number' ? t * 1000 : typeof t === 'string' ? Date.parse(t) : Date.UTC(t.year, t.month - 1, t.day))

export function baseOptions(o: { seconds?: boolean; daily?: boolean; price?: (p: number) => string } = {}): DeepPartial<ChartOptions> {
  return {
    autoSize: true,
    layout: {
      background: { type: ColorType.Solid, color: 'rgba(0,0,0,0)' },
      textColor: C.muted,
      fontFamily: "'Lato', system-ui, sans-serif",
      fontSize: 11,
      attributionLogo: false,
    },
    grid: {
      vertLines: { visible: false },
      horzLines: { color: C.grid, style: LineStyle.Dashed },
    },
    rightPriceScale: { borderColor: C.border, scaleMargins: { top: 0.16, bottom: 0.08 }, minimumWidth: 64 },
    timeScale: {
      borderColor: C.border,
      timeVisible: true,
      secondsVisible: !!o.seconds,
      tickMarkFormatter: (t: Time, type: TickMarkType) => {
        const ms = timeMs(t)
        if (type === TickMarkType.TimeWithSeconds) return fmtTime(ms, true)
        if (type === TickMarkType.Time) return fmtTime(ms, !!o.seconds)
        if (type === TickMarkType.DayOfMonth) return fmtDayTick(new Date(ms).setHours(0, 0, 0, 0))
        return null
      },
    },
    crosshair: {
      mode: CrosshairMode.Normal,
      vertLine: { color: 'rgba(242,240,230,0.3)', labelBackgroundColor: C.raised, style: LineStyle.Dashed },
      horzLine: { color: 'rgba(242,240,230,0.3)', labelBackgroundColor: C.raised, style: LineStyle.Dashed },
    },
    localization: {
      timeFormatter: (t: Time) => {
        return fmtDateTime(timeMs(t))
      },
      priceFormatter: o.price,
    },
    handleScale: { axisPressedMouseMove: { time: true, price: true } },
  }
}

/** Axis dollars: compact from $1K, cents below it so close ticks stay distinct. */
export const usdAxis = (p: number) => (p < 0 ? '-$' : '$') + (Math.abs(p) < 1000 ? Math.abs(p).toFixed(2) : compact(Math.abs(p)))

/** Length of a chart range key ("1h", "7d"…) in ms; null for "all" or anything else. */
export function rangeMs(range: string | undefined): number | null {
  const m = range ? /^(\d+)([hd])$/.exec(range) : null
  return m ? Number(m[1]) * (m[2] === 'h' ? 3_600_000 : 86_400_000) : null
}
