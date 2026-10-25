import type { CSSProperties, ReactNode } from 'react'

/*
 * Chalk doodles on the landing board (decorative, aria-hidden, pointer-events: none).
 *
 * Every stroke is a <path pathLength=1> so CSS can "draw" it with stroke-dashoffset 1 → 0
 * (see `.chd .s` in app.css). Paths are generated once at module load from point lists with a
 * seeded jitter so lines wobble like chalk instead of looking vector-perfect.
 * Timing: each doodle has a start delay (--d) and every stroke/label inside an index (--i);
 * CSS staggers them by --i × --ds (.11 s). Reduced motion → CSS drops the animations, drawings static.
 */

export type Pt = [number, number]
export const v = (o: Record<string, string | number>) => o as CSSProperties
export const f = (n: number) => Math.round(n * 10) / 10

/** deterministic PRNG (mulberry32) so the wobble is identical on every render */
export function rand(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Catmull-Rom spline through the points → cubic Béziers */
export function smooth(p: Pt[]): string {
  let d = `M${f(p[0][0])} ${f(p[0][1])}`
  if (p.length === 2) return d + `L${f(p[1][0])} ${f(p[1][1])}`
  for (let i = 0; i < p.length - 1; i++) {
    const p0 = p[i - 1] ?? p[i]
    const p1 = p[i]
    const p2 = p[i + 1]
    const p3 = p[i + 2] ?? p2
    d += `C${f(p1[0] + (p2[0] - p0[0]) / 6)} ${f(p1[1] + (p2[1] - p0[1]) / 6)} ${f(p2[0] - (p3[0] - p1[0]) / 6)} ${f(p2[1] - (p3[1] - p1[1]) / 6)} ${f(p2[0])} ${f(p2[1])}`
  }
  return d
}

/** hand-drawn polyline: segments subdivided every `step` units and nudged sideways by ±amp */
export function hand(pts: Pt[], seed = 1, amp = 1, step = 22): string {
  const r = rand(seed)
  const out: Pt[] = []
  for (let i = 0; i < pts.length - 1; i++) {
    const [x1, y1] = pts[i]
    const [x2, y2] = pts[i + 1]
    const len = Math.hypot(x2 - x1, y2 - y1) || 1
    const n = Math.max(1, Math.round(len / step))
    const nx = -(y2 - y1) / len
    const ny = (x2 - x1) / len
    for (let k = i ? 1 : 0; k <= n; k++) {
      const t = k / n
      const j = (r() - 0.5) * 2 * amp * (k === 0 || k === n ? 0.4 : 1)
      out.push([x1 + (x2 - x1) * t + nx * j, y1 + (y2 - y1) * t + ny * j])
    }
  }
  return smooth(out)
}

/** loose hand-drawn ellipse that overshoots its start, like a quick chalk circle */
export function ring(cx: number, cy: number, rx: number, ry = rx, seed = 1, turns = 1.1, amp = 0.05): string {
  const r = rand(seed)
  const a0 = r() * Math.PI * 2
  const n = Math.round((12 + Math.max(rx, ry) / 4) * turns)
  const pts: Pt[] = []
  for (let i = 0; i <= n; i++) {
    const a = a0 + (turns * Math.PI * 2 * i) / n
    const k = 1 + (r() - 0.5) * 2 * amp
    pts.push([cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k])
  }
  return smooth(pts)
}

/** arrow head strokes at `tip`, pointing away from `from` */
export function head(tip: Pt, from: Pt, size = 11, spread = 0.5): string {
  const a = Math.atan2(from[1] - tip[1], from[0] - tip[0])
  const p1: Pt = [tip[0] + Math.cos(a + spread) * size, tip[1] + Math.sin(a + spread) * size]
  const p2: Pt = [tip[0] + Math.cos(a - spread) * size, tip[1] + Math.sin(a - spread) * size]
  return `M${f(p1[0])} ${f(p1[1])}L${f(tip[0])} ${f(tip[1])}L${f(p2[0])} ${f(p2[1])}`
}

/** hand arrow along a few points, with a head at the last point */
export const arrow = (pts: Pt[], seed: number, size = 10, amp = 1) => hand(pts, seed, amp) + head(pts[pts.length - 1], pts[pts.length - 2], size)

/** five-point star drawn in one stroke */
export function star(cx: number, cy: number, r: number, seed: number): string {
  const pts: Pt[] = []
  for (let k = 0; k <= 5; k++) {
    const a = -Math.PI / 2 + (k * 4 * Math.PI) / 5
    pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r])
  }
  return hand(pts, seed, 0.6, 9)
}

export const CHALK = '#efeee6'
export const MINT = '#8ff0b0'
export const PINK = '#ff8f9f'
export const YELLOW = '#f3e27a'
const BLUE_ = '#9fd3ff'

/* ---------- primitives ---------- */

export function S({ d, i, c, w, t, cls }: { d: string; i: number; c?: string; w?: number; t?: number; cls?: string }) {
  const st: Record<string, string | number> = { '--i': i }
  if (w) st['--w'] = w
  if (t) st['--t'] = `${t}s`
  return <path className={cls ? `s ${cls}` : 's'} d={d} pathLength={1} stroke={c} style={v(st)} />
}

/** dashed guide line (no pathLength: the dash pattern is real units) — fades in */
export function G({ d, i, c }: { d: string; i: number; c?: string }) {
  return <path className="g" d={d} stroke={c} style={v({ '--i': i })} />
}

export function T({ x, y, i, s = 20, c, a, cls, children }: { x: number; y: number; i: number; s?: number; c?: string; a?: 'start' | 'middle' | 'end'; cls?: string; children: ReactNode }) {
  return (
    <text className={cls ? `tx ${cls}` : 'tx'} x={x} y={y} fontSize={s} fill={c ?? 'currentColor'} stroke="none" textAnchor={a} style={v({ '--i': i })}>
      {children}
    </text>
  )
}

function Doodle({ name, vb, d, loop, children }: { name: string; vb: string; d: number; loop?: [number, number]; children: ReactNode }) {
  const st: Record<string, string> = { '--d': `${d}s` }
  if (loop) {
    st['--lp'] = `${loop[0]}s`
    st['--lo'] = `${loop[1]}s`
  }
  return (
    <svg className={`chd chd-${name}${loop ? ' loop' : ''}`} viewBox={vb} fill="none" stroke="currentColor" style={v(st)} focusable="false" aria-hidden="true">
      {children}
    </svg>
  )
}

/* ---------- geometry (computed once) ---------- */

// decay chart: origin (40,176), 1 day = 90 units, 100% = 150 units
const DX = (t: number) => 40 + t * 90
const DY = (n: number) => 176 - 150 * n
const decayCurve = (() => {
  const r = rand(77)
  const pts: Pt[] = []
  for (let t = 0; t <= 3.22; t += 0.14) pts.push([DX(t) + (r() - 0.5) * 0.8, DY(Math.pow(2, -t)) + (r() - 0.5) * 1.4])
  return smooth(pts)
})()

// candles: [x, wickTop, bodyTop, bodyBottom, wickBottom, up]
const CANDLES: [number, number, number, number, number, boolean][] = [
  [38, 104, 112, 128, 138, true],
  [66, 98, 106, 122, 132, false],
  [94, 84, 92, 116, 124, true],
  [122, 68, 78, 100, 106, true],
  [150, 72, 80, 92, 102, false],
  [178, 44, 54, 84, 92, true],
  [206, 20, 30, 60, 68, true],
]
const candlePath = ([x, wt, bt, bb, wb]: (typeof CANDLES)[number], k: number) =>
  hand([[x, wt], [x, bt]], 300 + k, 0.4) + hand([[x - 7, bt], [x + 7, bt], [x + 7, bb], [x - 7, bb], [x - 7, bt - 1]], 320 + k, 0.7, 10) + hand([[x, bb], [x, wb]], 340 + k, 0.4)

/* ---------- doodles ---------- */
/* Timing: the whole board draws in ≈4 s (--d ≤ 3.3 s, stagger --ds = .11 s per --i, strokes .4–.8 s).
   Idle life: doodles with `loop={[period, offset]}` wipe + redraw forever (offsets 4.3–14 s, periods 6–12 s, so something is
   always being redrawn); `cls="lp"` loops only those strokes. Candles get a felt-eraser pass every 11 s. */

/** N(t) halving: 100% → 50% (1d) → 25% (2d) → 12.5% (3d); the curve + points redraw every 9 s */
function Decay() {
  const pts: [number, string, number, number][] = [
    [1, '50%', 140, 96],
    [2, '25%', 230, 132],
    [3, '12.5%', 290, 147],
  ]
  return (
    <Doodle name="decay" vb="0 0 360 210" d={0.1} loop={[9, 4.6]}>
      <S d={arrow([[40, 182], [40, 10]], 11, 8, 0.7) + arrow([[34, 176], [348, 176]], 12, 8, 0.7)} i={0} t={0.6} />
      <S d={decayCurve} i={1} c={MINT} w={2.8} t={1} cls="lp" />
      {pts.map(([t], k) => (
        <S key={t} d={hand([[DX(t), 171], [DX(t), 182]], 20 + k, 0.3)} i={2 + k} t={0.3} />
      ))}
      {pts.map(([t], k) => (
        <G key={t} i={4 + k} d={`M${DX(0) + 2} ${f(DY(Math.pow(2, -t)))}H${DX(t)}V174`} />
      ))}
      {pts.map(([t], k) => (
        <S key={t} d={ring(DX(t), DY(Math.pow(2, -t)), 3.6, 3.6, 40 + k, 1.05, 0.1)} i={5 + k} c={MINT} w={2.4} t={0.4} cls="lp" />
      ))}
      {pts.map(([t], k) => (
        <T key={t} x={DX(t)} y={200} i={5 + k} s={17} a="middle">
          {t}d
        </T>
      ))}
      {pts.map(([t, label, x, y], k) => (
        <T key={label} x={x} y={y} i={6 + k} s={17} c={MINT} cls="lbl">
          {label}
        </T>
      ))}
      <T x={52} y={18} i={1} s={18}>
        N(t)
      </T>
      <T x={4} y={DY(1) + 6} i={1} s={14}>
        100
      </T>
      <T x={170} y={52} i={8} s={19} c={MINT}>
        ×½ every day
      </T>
    </Doodle>
  )
}

/** candlesticks trending up; every 11 s a felt eraser wipes them and they're redrawn */
function Candles() {
  return (
    <Doodle name="candles" vb="0 0 250 160" d={0.4}>
      <S d={hand([[16, 8], [16, 148], [244, 148]], 5, 0.8)} i={0} t={0.6} />
      {CANDLES.map((c, k) => (
        <S key={k} d={candlePath(c, k)} i={1 + k * 0.7} c={c[5] ? MINT : PINK} w={2.2} t={0.45} cls="loop-erase" />
      ))}
      <S d={arrow([[30, 140], [92, 118], [150, 86], [222, 18]], 9, 11, 1.4)} i={6} c={YELLOW} w={2} t={0.6} cls="loop-erase" />
      <T x={24} y={22} i={1} s={16}>
        BTC
      </T>
      <g className="eraser">
        <path d="M-70 60h44a5 5 0 0 1 5 5v36a5 5 0 0 1-5 5h-44a5 5 0 0 1-5-5v-36a5 5 0 0 1 5-5z" strokeWidth="2" fill="rgba(0,0,0,.18)" />
        <path d="M-75 74h54" strokeWidth="1.6" />
        <path d="M-120 66h40M-132 82h52M-118 98h38" strokeWidth="5" strokeLinecap="round" opacity=".35" />
      </g>
    </Doodle>
  )
}

/** the half-life formula, with real super/subscripts */
function Formula() {
  return (
    <Doodle name="formula" vb="0 0 420 170" d={1.4} loop={[12, 10.4]}>
      <T x={14} y={52} i={0} s={40}>
        N(t) = N
        <tspan dy={9} fontSize={24}>
          0
        </tspan>
        <tspan dy={-9}> · e</tspan>
        <tspan dy={-17} fontSize={26}>
          −λt
        </tspan>
      </T>
      <S d={hand([[4, 12], [300, 8], [304, 66], [6, 70], [3, 14]], 61, 1.2, 30)} i={1} w={1.8} t={0.8} />
      <T x={40} y={108} i={3} s={30}>
        λ = ln 2 / 1 day
      </T>
      <T x={62} y={152} i={4} s={30} c={YELLOW}>
        t
        <tspan dy={8} fontSize={18}>
          1/2
        </tspan>
        <tspan dy={-8}> = 24 h</tspan>
      </T>
      <S d={hand([[56, 162], [120, 165], [190, 160]], 63, 1.4)} i={5} c={YELLOW} w={2} t={0.4} />
      <S d={arrow([[316, 40], [356, 52], [372, 92], [352, 132], [222, 148]], 64, 9, 1.4)} i={6} w={1.8} t={0.7} />
    </Doodle>
  )
}

/** Perpetuals rocket + lightning */
function Rocket() {
  return (
    <Doodle name="rocket" vb="0 0 130 280" d={1.0} loop={[11, 7.9]}>
      <g transform="rotate(14 64 110)">
        <S d={hand([[46, 146], [46, 62], [52, 38], [64, 16], [76, 38], [82, 62], [82, 146], [46, 146]], 81, 0.7, 14)} i={0} t={0.7} />
        <S d={ring(64, 74, 9, 9, 82, 1.05, 0.08)} i={1} t={0.3} />
        <S d={hand([[46, 112], [30, 148], [46, 140]], 83, 0.5, 10) + hand([[82, 112], [98, 148], [82, 140]], 84, 0.5, 10)} i={2} t={0.4} />
        <S d={hand([[50, 152], [56, 176], [62, 160], [68, 186], [74, 156], [78, 170]], 85, 0.6, 9)} i={3} c={PINK} t={0.4} />
      </g>
      <S d={hand([[112, 120], [96, 166], [114, 162], [98, 212]], 86, 0.5, 10) + head([98, 212], [114, 162], 10)} i={4} c={YELLOW} w={2.6} t={0.4} />
      <S d={hand([[18, 196], [8, 226]], 87, 0.3) + hand([[34, 212], [26, 240]], 88, 0.3)} i={5} t={0.3} />
      <T x={64} y={272} i={5} s={34} c={YELLOW} a="middle" cls="chalkfont">
        PERPS
      </T>
    </Doodle>
  )
}

/** sparkle: 4-ray twinkle */
const sparkle = (cx: number, cy: number, r: number, seed: number) =>
  hand([[cx, cy - r], [cx, cy + r]], seed, 0.2, 40) + hand([[cx - r, cy], [cx + r, cy]], seed + 1, 0.2, 40)

/** $CHALK coin with a G, ringed by sparkles that twinkle (redraw every 6 s) */
function Coin() {
  return (
    <Doodle name="coin" vb="0 0 150 150" d={0.6} loop={[6, 4.3]}>
      <S d={ring(70, 70, 46, 44, 91, 1.12, 0.04)} i={0} c={MINT} t={0.6} />
      <S d={ring(70, 70, 36, 34, 92, 1.05, 0.05)} i={1} c={MINT} w={1.6} t={0.4} />
      <T x={70} y={89} i={2} s={52} c={MINT} a="middle" cls="chalkfont">
        G
      </T>
      <S d={hand([[112, 26], [122, 16]], 93, 0.3) + hand([[120, 40], [134, 36]], 94, 0.3) + hand([[104, 16], [107, 8]], 95, 0.3)} i={2} t={0.3} cls="lp" />
      <S d={sparkle(20, 22, 7, 96)} i={3} c={YELLOW} w={1.8} t={0.3} cls="lp" />
      <S d={sparkle(134, 104, 6, 98)} i={3.5} w={1.6} t={0.3} cls="lp" />
      <S d={sparkle(10, 96, 5, 100)} i={4} c={MINT} w={1.6} t={0.3} cls="lp" />
      <S d={star(132, 70, 6, 102)} i={4.5} c={YELLOW} w={1.4} t={0.3} cls="lp" />
      <S d={hand([[30, 124], [22, 132]], 103, 0.3) + hand([[22, 116], [12, 118]], 104, 0.3)} i={5} t={0.3} cls="lp" />
      <T x={70} y={146} i={5} s={17} a="middle">
        $CHALK
      </T>
    </Doodle>
  )
}

/** ½ → ¼ → ⅛ as hand-written fractions */
function Halves() {
  const xs: [number, string][] = [
    [20, '2'],
    [96, '4'],
    [172, '8'],
  ]
  return (
    <Doodle name="halves" vb="0 0 200 64" d={2.2} loop={[11, 12.5]}>
      {xs.map(([x, den], k) => (
        <g key={x}>
          <T x={x} y={24} i={k * 2} s={22} a="middle">
            1
          </T>
          <S d={hand([[x - 12, 31], [x + 12, 30]], 100 + k, 0.5)} i={k * 2} t={0.3} />
          <T x={x} y={54} i={k * 2} s={22} a="middle">
            {den}
          </T>
          {k < 2 && <S d={arrow([[x + 20, 32], [x + 54, 31]], 110 + k, 7, 0.6)} i={k * 2 + 1} w={1.8} t={0.35} />}
        </g>
      ))}
    </Doodle>
  )
}

/** a long getting liquidated: price zig-zags down through the dashed liq. line → burst → +$CHALK */
function Liq() {
  const burst = Array.from({ length: 8 }, (_, k) => {
    const a = (k * Math.PI) / 4 + 0.2
    const r1 = 5
    const r2 = k % 2 ? 11 : 16
    return hand([[196 + Math.cos(a) * r1, 82 + Math.sin(a) * r1], [196 + Math.cos(a) * r2, 82 + Math.sin(a) * r2]], 150 + k, 0.2)
  }).join('')
  return (
    <Doodle name="liq" vb="0 0 270 112" d={0.2} loop={[10, 11]}>
      <G d="M8 82H262" i={0} c={PINK} />
      <T x={8} y={104} i={0} s={15} c={PINK}>
        liq. price
      </T>
      <S d={hand([[10, 20], [34, 34], [52, 26], [78, 50], [98, 40], [124, 62], [146, 52], [170, 72], [192, 80]], 141, 0.8, 9)} i={1} t={0.8} />
      <S d={burst} i={6} c={PINK} w={2} t={0.3} />
      <S d={arrow([[204, 66], [214, 46], [222, 30]], 142, 8, 0.6)} i={7} c={MINT} w={1.8} t={0.3} />
      <T x={196} y={20} i={7} s={18} c={MINT}>
        +$CHALK
      </T>
    </Doodle>
  )
}

/** mini order book: asks (pink) above, bids (mint) below, mid = (bid + ask) / 2 on the dashed line */
function Ladder() {
  const asks = [38, 30, 50, 22, 14]
  const bids = [16, 26, 20, 44, 34]
  return (
    <Doodle name="ladder" vb="0 0 140 170" d={0.8} loop={[10, 7.4]}>
      <S d={hand([[124, 6], [124, 160]], 160, 0.5, 20)} i={0} t={0.4} />
      {asks.map((w, k) => (
        <S key={`a${k}`} d={hand([[120, 12 + k * 14], [120 - w * 1.6, 12 + k * 14]], 161 + k, 0.3, 40)} i={0.6 + (4 - k) * 0.35} c={PINK} w={5} t={0.25} />
      ))}
      <G d="M8 85H130" i={2.6} c={YELLOW} />
      {bids.map((w, k) => (
        <S key={`b${k}`} d={hand([[120, 100 + k * 14], [120 - w * 1.6, 100 + k * 14]], 171 + k, 0.3, 40)} i={0.6 + k * 0.35} c={MINT} w={5} t={0.25} />
      ))}
      <T x={4} y={30} i={1} s={17} c={PINK}>
        ask
      </T>
      <T x={4} y={156} i={1} s={17} c={MINT}>
        bid
      </T>
      <T x={4} y={80} i={3} s={18} c={YELLOW}>
        mid
      </T>
    </Doodle>
  )
}

/** a wobbly price squiggle drifting up */
const squigglePath = (() => {
  const r = rand(181)
  const pts: Pt[] = []
  for (let x = 6; x <= 154; x += 6) pts.push([x, 44 - 13 * Math.sin(x / 11) - x * 0.16 + (r() - 0.5) * 7])
  return smooth(pts)
})()
function Squiggle() {
  return (
    <Doodle name="squiggle" vb="0 0 170 76" d={1.1} loop={[7, 5]}>
      <S d={hand([[4, 70], [166, 70]], 182, 0.5)} i={0} t={0.35} cls="faint" />
      <S d={squigglePath} i={0.5} c={MINT} w={2.2} t={0.8} />
      <S d={ring(154, f(44 - 13 * Math.sin(154 / 11) - 154 * 0.16), 3.5, 3.5, 183, 1.05, 0.1)} i={6} c={MINT} w={2.2} t={0.25} />
      <T x={8} y={16} i={1} s={14}>
        ETH
      </T>
    </Doodle>
  )
}

/** "PnL fee" stamp, circled twice */
function Stamp() {
  return (
    <Doodle name="stamp" vb="0 0 130 100" d={1.6} loop={[12, 8.6]}>
      <g transform="rotate(-9 65 50)">
        <T x={65} y={50} i={0} s={40} c={YELLOW} a="middle" cls="chalkfont">
          2%
        </T>
        <T x={65} y={76} i={1} s={22} c={YELLOW} a="middle">
          win fee
        </T>
        <S d={ring(65, 52, 58, 40, 191, 1.25, 0.06)} i={1} c={YELLOW} w={2.2} t={0.6} />
        <S d={ring(65, 52, 52, 35, 192, 1.05, 0.08)} i={3} c={YELLOW} w={1.3} t={0.4} />
      </g>
    </Doodle>
  )
}

/** fee split pie: 2% fee = 1% operator + 1% $CHALK holders (hatched half) */
function Pie() {
  const hatch = Array.from({ length: 6 }, (_, k) => {
    const x = 64 + k * 7
    const h = Math.sqrt(Math.max(0, 34 * 34 - (x - 60) * (x - 60)))
    return hand([[x, 54 + h * 0.85], [x + 4, 54 - h * 0.85]], 201 + k, 0.2)
  }).join('')
  return (
    <Doodle name="pie" vb="0 0 120 124" d={1.8} loop={[9, 9.8]}>
      <S d={ring(60, 54, 40, 40, 200, 1.06, 0.04)} i={0} t={0.5} />
      <S d={hand([[60, 12], [60, 96]], 208, 0.5)} i={1} t={0.3} />
      <S d={hatch} i={2} c={MINT} w={1.4} t={0.4} />
      <T x={40} y={62} i={2} s={20} a="middle">
        1%
      </T>
      <T x={82} y={62} i={3} s={20} a="middle" c={MINT}>
        1%
      </T>
      <T x={60} y={120} i={3} s={17} a="middle" c={YELLOW}>
        2% fee split
      </T>
    </Doodle>
  )
}

/** payout clock: a 30 s arc and a sweeping hand */
function Clock() {
  const ticks = [0, 1, 2, 3].map((k) => {
    const a = (k * Math.PI) / 2
    return hand([[50 + Math.sin(a) * 34, 46 - Math.cos(a) * 34], [50 + Math.sin(a) * 40, 46 - Math.cos(a) * 40]], 211 + k, 0.2)
  }).join('')
  const arc = (() => {
    const pts: Pt[] = []
    for (let k = 0; k <= 12; k++) {
      const a = (k / 12) * Math.PI
      pts.push([50 + Math.sin(a) * 28, 46 - Math.cos(a) * 28])
    }
    return smooth(pts)
  })()
  return (
    <Doodle name="clock" vb="0 0 100 112" d={2.0} loop={[12, 6.6]}>
      <S d={ring(50, 46, 40, 40, 210, 1.06, 0.04)} i={0} c={BLUE_} t={0.5} />
      <S d={ticks} i={1} c={BLUE_} t={0.3} />
      <S d={arc} i={2} c={YELLOW} w={3} t={0.45} />
      <g className="hand">
        <S d={hand([[50, 46], [50, 16]], 216, 0.2)} i={3} c={BLUE_} w={2.4} t={0.25} />
      </g>
      <T x={50} y={106} i={3} s={19} a="middle" c={BLUE_}>
        every 30 s
      </T>
    </Doodle>
  )
}

/** "×½" / "÷2" scribbles */
function Times() {
  return (
    <Doodle name="times" vb="0 0 84 60" d={2.5} loop={[7, 6.8]}>
      <T x={6} y={40} i={0} s={36} c={MINT}>
        ×½
      </T>
      <S d={hand([[4, 50], [70, 47]], 221, 0.8)} i={1} c={MINT} w={1.8} t={0.3} />
    </Doodle>
  )
}
function Div() {
  return (
    <Doodle name="div" vb="0 0 84 64" d={2.7} loop={[8, 9.2]}>
      <T x={10} y={42} i={0} s={36}>
        ÷2
      </T>
      <S d={ring(36, 30, 32, 24, 231, 1.2, 0.07)} i={1} w={1.6} t={0.45} />
    </Doodle>
  )
}

/** τ = 34.6 h and cashback = R / L, written in the How-it-works header row */
function Tau() {
  return (
    <Doodle name="tau" vb="0 0 170 50" d={2.8} loop={[10, 13.1]}>
      <T x={4} y={34} i={0} s={28}>
        τ = 34.6 h
      </T>
      <S d={hand([[2, 44], [140, 41]], 241, 1)} i={1} c={YELLOW} w={1.8} t={0.35} />
    </Doodle>
  )
}
function RL() {
  return (
    <Doodle name="rl" vb="0 0 200 60" d={3.0} loop={[9, 11.7]}>
      <T x={4} y={38} i={0} s={24}>
        cashback =
      </T>
      <T x={150} y={24} i={1} s={22} a="middle" c={MINT}>
        R
      </T>
      <S d={hand([[136, 31], [164, 30]], 251, 0.4)} i={1} c={MINT} w={1.8} t={0.25} />
      <T x={150} y={52} i={2} s={22} a="middle" c={PINK}>
        L
      </T>
    </Doodle>
  )
}

function Star({ n, d, c }: { n: number; d: number; c?: string }) {
  return (
    <Doodle name={`star chd-star${n}`} vb="0 0 44 44" d={d}>
      <S d={star(22, 23, 18, 200 + n)} i={0} c={c} w={2} t={0.45} />
    </Doodle>
  )
}

function Scribble() {
  return (
    <Doodle name="scribble" vb="0 0 120 60" d={2.4} loop={[10, 14]}>
      <S d={ring(52, 30, 44, 20, 120, 1.25, 0.08)} i={0} c={MINT} w={1.8} t={0.6} />
      <T x={52} y={37} i={1} s={20} c={MINT} a="middle">
        +100%
      </T>
    </Doodle>
  )
}


/** background layer: positioned per breakpoint in app.css (.chd-*) */
export default function ChalkDoodles() {
  return (
    <div className="chalk-doodles" aria-hidden="true">
      <i className="smudge sm1" />
      <i className="smudge sm2" />
      <i className="smudge sm3" />
      <i className="smudge sm4" />
      <i className="smudge wipe sm5" />
      <i className="smudge wipe sm6" />
      <i className="smudge wipe sm7" />
      <Decay />
      <Candles />
      <Formula />
      <Rocket />
      <Coin />
      <Halves />
      <Scribble />
      <Liq />
      <Ladder />
      <Squiggle />
      <Stamp />
      <Pie />
      <Clock />
      <Times />
      <Div />
      <Star n={1} d={2.9} c={YELLOW} />
      <Star n={2} d={3.1} />
      <Star n={3} d={3.3} c={MINT} />
      <Star n={4} d={3.0} c={PINK} />
      <Star n={5} d={3.2} c={YELLOW} />
      <Star n={6} d={2.6} />
    </div>
  )
}

/** chalk marks that belong to the hero copy itself (underline under the headline, wavy line under the half-life,
 *  arrow pointing at TRADE); anchored to the text so they track it at every size */
export function HeadlineUnderline() {
  return (
    <svg className="chd chd-uline" viewBox="0 0 320 14" preserveAspectRatio="none" fill="none" stroke="currentColor" style={v({ '--d': '0.25s', '--lp': '12s', '--lo': '13.6s' })} aria-hidden="true" focusable="false">
      <S d={hand([[3, 8], [110, 5], [220, 8], [317, 6]], 261, 1.4, 30)} i={0} c={YELLOW} w={2.6} t={0.6} cls="lp" />
    </svg>
  )
}
export function WavyUnderline() {
  const pts: Pt[] = []
  for (let x = 2; x <= 198; x += 6) pts.push([x, 5 + Math.sin(x / 7) * 2.4])
  return (
    <svg className="chd chd-wavy" viewBox="0 0 200 10" preserveAspectRatio="none" fill="none" stroke="currentColor" style={v({ '--d': '0.9s', '--lp': '10s', '--lo': '8.1s' })} aria-hidden="true" focusable="false">
      <S d={smooth(pts)} i={0} c={MINT} w={2} t={0.6} cls="lp" />
    </svg>
  )
}
export function TradeArrow() {
  return (
    <svg className="chd chd-tarrow loop" viewBox="0 0 250 92" fill="none" stroke="currentColor" style={v({ '--d': '1.3s', '--lp': '8s', '--lo': '5.6s' })} aria-hidden="true" focusable="false">
      <S d={hand([[196, 62], [176, 80], [140, 82], [96, 66], [62, 40], [44, 10]], 271, 1.2, 14) + head([44, 10], [56, 30], 12, 0.55)} i={0} c={YELLOW} w={2.4} t={0.7} />
      <T x={204} y={70} i={4} s={24} c={YELLOW}>
        try it!
      </T>
    </svg>
  )
}

/** τ and R/L written in the How-it-works header row, between the heading and the flow doodle (anchored to .how) */
export function HowRowDoodles() {
  return (
    <div className="how-row-doodles" aria-hidden="true">
      <Tau />
      <RL />
    </div>
  )
}

/** "trade → $CHALK → USDC", sits in the How-it-works header row (anchored to .how) */
export function ChalkFlow() {
  return (
    <div className="how-doodle" aria-hidden="true">
      <Doodle name="flow" vb="0 0 360 58" d={2.0} loop={[12, 9.5]}>
        <T x={0} y={38} i={0} s={26} c={YELLOW}>
          trade
        </T>
        <S d={arrow([[60, 30], [106, 29]], 131, 9, 0.8)} i={1} t={0.35} />
        <T x={114} y={38} i={2} s={26} c={MINT}>
          $CHALK
        </T>
        <S d={arrow([[204, 30], [252, 29]], 132, 9, 0.8)} i={3} t={0.35} />
        <T x={264} y={38} i={4} s={26}>
          USDC
        </T>
        <S d={ring(292, 29, 40, 20, 133, 1.12, 0.05)} i={5} c={YELLOW} w={1.8} t={0.5} />
      </Doodle>
    </div>
  )
}
