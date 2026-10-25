import { useElementSize } from '../primitives'
import { C } from './lw'

const TICKS = '2 5'

/** Donut showing FIFO queue entries; the connected user's entries highlighted. */
export function QueueRing({ entries, mine }: { entries: { amount: number; user: string }[]; mine: string | null }) {
  const [ref, { w, h }] = useElementSize<HTMLDivElement>(Math.floor)
  const total = entries.reduce((a, e) => a + e.amount, 0)
  const r = Math.max(10, Math.min(58, Math.min(w, h) / 2 - 8))
  const cx = w / 2
  const cy = h / 2
  let acc = 0
  const arcs = total > 0
    ? entries.map((e, i) => {
        const a0 = (acc / total) * Math.PI * 2 - Math.PI / 2
        acc += e.amount
        const a1 = (acc / total) * Math.PI * 2 - Math.PI / 2
        const large = a1 - a0 > Math.PI ? 1 : 0
        const p = (a: number, rr: number) => `${cx + Math.cos(a) * rr},${cy + Math.sin(a) * rr}`
        const isMine = !!mine && e.user.toLowerCase() === mine.toLowerCase()
        // An arc whose ends coincide draws nothing, so a full ring is two half arcs.
        const d = a1 - a0 >= Math.PI * 2 - 1e-6
          ? `M${p(a0, r)}A${r},${r} 0 1 1 ${p(a0 + Math.PI, r)}A${r},${r} 0 1 1 ${p(a0, r)}`
          : `M${p(a0, r)}A${r},${r} 0 ${large} 1 ${p(a1, r)}`
        return (
          <path
            key={i}
            d={d}
            stroke={isMine ? C.accent : i === 0 ? C.posText : C.ink}
            strokeWidth={isMine ? 14 : 12}
            strokeDasharray={TICKS}
            fill="none"
          />
        )
      })
    : null
  return (
    <div ref={ref} style={{ position: 'absolute', inset: 0 }}>
      {w > 0 && (
        <svg width={w} height={h}>
          {!arcs && <circle cx={cx} cy={cy} r={r} stroke={C.muted} strokeWidth={12} fill="none" strokeDasharray={TICKS} />}
          {arcs}
          <text x={cx} y={cy + 8} textAnchor="middle" fontSize="38" fontWeight="700" fill={C.ink} style={{ fontFamily: 'var(--font-ui)' }}>
            {entries.length}
          </text>
          <text x={cx} y={cy + 24} textAnchor="middle" fontSize="9" fontWeight="700" fill={C.muted} letterSpacing=".1em" style={{ fontFamily: 'var(--font-ui)' }}>
            IN QUEUE
          </text>
        </svg>
      )}
    </div>
  )
}

/** House PnL across a price move around the mark (papertrade style): a zero axis across, the mark as a solid vertical axis,
 *  green where the house gains and red where it loses, the ±scale top-left / bottom-left, −1% · mark price · +1% below. */
export function PnlCurve({ points, fmt, priceFmt }: { points: { price: number; housePnl: number }[]; fmt: (n: number) => string; priceFmt: (n: number) => string }) {
  const [ref, { w, h }] = useElementSize<HTMLDivElement>(Math.floor)
  const pad = { l: 4, r: 4, t: 26, b: 30 }
  const ok = points.length > 1 && w > 40 && h > 80
  const vals = points.map((p) => p.housePnl)
  // symmetric around zero, so the zero axis sits in the middle like the mark does
  const m = Math.max(1e-9, ...vals.map(Math.abs)), hi = m, lo = -m
  const x = (i: number) => pad.l + (i / (points.length - 1)) * (w - pad.l - pad.r)
  const y = (v: number) => pad.t + ((hi - v) / (hi - lo)) * (h - pad.t - pad.b)
  const zero = y(0), mid = Math.floor(points.length / 2), xm = x(mid)
  const line = points.map((p, i) => `${i ? 'L' : 'M'}${x(i)},${y(p.housePnl)}`).join('')
  const area = `${line}L${x(points.length - 1)},${zero}L${x(0)},${zero}Z`
  return (
    <div className="ui-pnl-curve" ref={ref}>
      {ok && <svg width={w} height={h} role="img" aria-label={`House PnL from −1% to +1%: ${fmt(points[0].housePnl)} to ${fmt(points[points.length - 1].housePnl)}`}>
        <defs>
          <clipPath id="pnl-up"><rect x={0} y={0} width={w} height={zero} /></clipPath>
          <clipPath id="pnl-down"><rect x={0} y={zero} width={w} height={h - zero} /></clipPath>
        </defs>
        <path d={area} fill={C.pos} fillOpacity={0.16} clipPath="url(#pnl-up)" />
        <path d={area} fill={C.neg} fillOpacity={0.16} clipPath="url(#pnl-down)" />
        <line x1={pad.l} x2={w - pad.r} y1={zero} y2={zero} stroke={C.muted} strokeOpacity={0.6} />
        <line x1={xm} x2={xm} y1={pad.t - 6} y2={h - pad.b + 2} stroke={C.muted} strokeOpacity={0.6} />
        <path d={line} fill="none" stroke={C.ink} strokeWidth={2} strokeLinejoin="round" />
        <circle cx={xm} cy={y(points[mid].housePnl)} r={4} fill={C.ink} />
        <text x={pad.l} y={14} fill={C.muted} fontSize={12}>{fmt(hi)}</text>
        <text x={pad.l} y={h - pad.b - 6} fill={C.muted} fontSize={12}>{fmt(lo)}</text>
        <text x={pad.l} y={h - 8} fill={C.muted} fontSize={12}>−1%</text>
        <text x={xm} y={h - 8} fill={C.muted} fontSize={12} textAnchor="middle">{priceFmt(points[mid].price)}</text>
        <text x={w - pad.r} y={h - 8} fill={C.muted} fontSize={12} textAnchor="end">+1%</text>
      </svg>}
    </div>
  )
}
