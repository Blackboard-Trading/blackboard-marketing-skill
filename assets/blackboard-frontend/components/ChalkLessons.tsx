import { useEffect, type ReactNode, type RefObject } from 'react'
import { Link } from 'react-router-dom'
import { ComingSoonTrade } from './ComingSoonTrade'
import { arrow, f, G, hand, head, MINT, PINK, rand, ring, S, smooth, star, T, v, YELLOW, type Pt } from './ChalkDoodles'

/*
 * Chalkboard lesson diagrams for /docs (pages/Docs.tsx). Each diagram / decoration / text block carries `.rv`;
 * `useReveal` adds `.in` once when it scrolls into view and CSS (app.css, `.lessons`) draws the strokes
 * (pathLength=1 → stroke-dashoffset) staggered by --i, labels write in after.
 * Numbers come from the contracts (and the owner's worked examples) — never invent new ones.
 * Labels are ≥ 22 units in 640-wide viewBoxes so they stay ≥ 12 px on a phone.
 */

export const BLUE = '#9fd3ff'

/** hand-drawn rectangle */
export const box = (x: number, y: number, w: number, h: number, seed: number, amp = 1.1) =>
  hand([[x, y + 2], [x + w, y], [x + w + 1, y + h], [x, y + h + 1], [x - 1, y - 3]], seed, amp, 28)

/** lesson diagram svg: draws on when `.in` is added */
export function Board({ name, vb, label, st, children }: { name: string; vb: string; label?: string; st?: number; children: ReactNode }) {
  return (
    <svg
      className={`cl cl-${name} rv`}
      viewBox={vb}
      fill="none"
      stroke="currentColor"
      focusable="false"
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      style={st ? v({ '--st': `${st}s` }) : undefined}
    >
      {children}
    </svg>
  )
}

/** chalk heading: kicker + Cabin Sketch title + a drawn underline */
export function Head({ n, title, color = YELLOW }: { n: number; title: string; color?: string }) {
  return (
    <header className="l-head">
      <span className="l-kicker rv">
        <svg className="cl rv" viewBox="0 0 40 40" aria-hidden="true" focusable="false" fill="none" stroke="currentColor">
          <S d={ring(20, 20, 15, 14, 700 + n, 1.12, 0.06)} i={0} c={color} w={2.2} />
        </svg>
        <b>{n}</b> Lesson {n}
      </span>
      <h2 className="rv">{title}</h2>
      <svg className="cl l-uline rv" viewBox="0 0 300 16" preserveAspectRatio="none" aria-hidden="true" focusable="false" fill="none" stroke="currentColor">
        <S d={hand([[4, 9], [120, 6], [296, 9]], 710 + n, 1.6, 30)} i={2} c={color} w={2.6} t={0.8} />
      </svg>
    </header>
  )
}

/* ---------- decorations (heading row / gaps only; hidden on narrow screens by CSS) ---------- */

export function DStar({ cls, c, seed }: { cls: string; c?: string; seed: number }) {
  return (
    <Board name={`deco ${cls}`} vb="0 0 44 44">
      <S d={star(22, 23, 18, seed)} i={0} c={c} w={2} />
    </Board>
  )
}
export function DText({ cls, vb, children }: { cls: string; vb: string; children: ReactNode }) {
  return (
    <Board name={`deco ${cls}`} vb={vb}>
      {children}
    </Board>
  )
}
export const Smudge = ({ cls }: { cls: string }) => <i className={`l-smudge ${cls}`} aria-hidden="true" />

/** adds `.in` to every `.rv` under `ref` once it scrolls into view (all at once with reduced motion) */
export function useReveal(ref: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const root = ref.current
    if (!root) return
    const els = Array.from(root.querySelectorAll<Element>('.rv'))
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (reduce || typeof IntersectionObserver === 'undefined') {
      els.forEach((e) => e.classList.add('in'))
      return
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue
          e.target.classList.add('in')
          io.unobserve(e.target)
        }
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.12 },
    )
    els.forEach((e) => io.observe(e))
    return () => io.disconnect()
  }, [ref])
}

/* ---------- 1. loss → $CHALK → USDG ---------- */

export function LossFlowBig() {
  return (
    <Board name="lossflow" vb="0 0 640 290" label="A losing trade of $100 mints 100 to 150 $CHALK; $CHALK earns a share of the income in USDG and fades by half every day">
      <S d={hand([[30, 34], [30, 160], [176, 160]], 1301, 0.6, 20)} i={0} t={0.6} />
      <S d={hand([[38, 54], [62, 70], [80, 62], [104, 96], [124, 88], [146, 128], [166, 146]], 1302, 0.8, 9) + head([166, 146], [146, 128], 10)} i={1} c={PINK} w={2.8} t={0.8} />
      <T x={104} y={198} i={3} s={22} a="middle" c={PINK}>
        a losing trade
      </T>
      <T x={104} y={230} i={3} s={28} a="middle" c={PINK}>
        −$100
      </T>
      <S d={arrow([[190, 104], [250, 102]], 1303, 10, 0.8)} i={4} t={0.4} />
      <T x={220} y={88} i={4} s={22} a="middle">
        mint
      </T>
      <S d={ring(326, 104, 58, 56, 1304, 1.12, 0.04)} i={5} c={MINT} w={2.8} t={0.7} />
      <S d={ring(326, 104, 46, 44, 1305, 1.05, 0.05)} i={6} c={MINT} w={1.6} t={0.5} />
      <T x={326} y={128} i={6} s={66} a="middle" c={MINT} cls="chalkfont">
        C
      </T>
      <T x={326} y={198} i={7} s={24} a="middle" c={MINT}>
        100 $CHALK
      </T>
      <S d={arrow([[400, 104], [460, 102]], 1306, 10, 0.8)} i={8} t={0.4} />
      <T x={430} y={88} i={8} s={22} a="middle">
        earns
      </T>
      <S d={ring(540, 104, 56, 56, 1307, 1.1, 0.04)} i={9} t={0.7} />
      <T x={540} y={126} i={10} s={60} a="middle" cls="chalkfont">
        $
      </T>
      <T x={540} y={198} i={10} s={24} a="middle">
        USDG
      </T>
      <S d={hand([[20, 252], [300, 248], [620, 252]], 1308, 1.4, 30)} i={11} w={1.4} cls="faint" />
      <T x={20} y={282} i={12} s={22}>
        1 $CHALK per $1 lost
      </T>
      <T x={620} y={282} i={13} s={22} a="end" c={YELLOW}>
        fades ×½ every day
      </T>
    </Board>
  )
}

/* ---------- 2. how a trade works ---------- */

export function TradeDiagram() {
  // Chainlink nodes (corners) agree on one median price (centre ring), which is signed and checked on-chain
  const nodes: Pt[] = [[52, 62], [188, 62], [52, 178], [188, 178]]
  const mid: Pt = [120, 120]
  return (
    <Board name="trade" vb="0 0 640 410" label="The price comes from Chainlink Data Streams: many independent Chainlink nodes agree on one price, the median, and sign it. The signed price is checked on-chain in the same transaction as your trade. You trade against the House: if you lose, the House keeps it; if you win, the House pays.">
      <S d={box(20, 30, 200, 186, 1311)} i={0} t={0.7} />
      <T x={120} y={22} i={1} s={22} a="middle">
        Chainlink Data Streams
      </T>
      {nodes.map(([x, y], k) => (
        <S key={`n${k}`} d={ring(x, y, 13, 13, 1312 + k, 1.08, 0.06)} i={1.5 + k * 0.3} w={1.8} t={0.3} />
      ))}
      {nodes.map(([x, y], k) => (
        <S
          key={`l${k}`}
          d={hand([[x + (mid[0] - x) * 0.22, y + (mid[1] - y) * 0.22], [x + (mid[0] - x) * 0.6, y + (mid[1] - y) * 0.6]], 1316 + k, 0.3, 40)}
          i={2.7 + k * 0.2}
          w={1.4}
          cls="faint"
          t={0.3}
        />
      ))}
      <S d={ring(mid[0], mid[1], 40, 25, 1320, 1.12, 0.05)} i={3.6} c={YELLOW} w={2.2} t={0.5} />
      <T x={mid[0]} y={mid[1] + 7} i={4} s={22} a="middle" c={YELLOW}>
        median
      </T>
      <T x={52} y={106} i={3} s={18} a="middle" cls="faint">
        nodes
      </T>
      <S d={arrow([[226, 124], [300, 122]], 1321, 10, 0.6)} i={4.5} t={0.4} />
      <T x={262} y={108} i={4.5} s={22} a="middle">
        signed
      </T>
      <S d={box(310, 86, 314, 70, 1322, 1.4)} i={5} c={YELLOW} t={0.6} />
      <T x={467} y={131} i={6} s={26} a="middle" c={YELLOW}>
        checked on-chain
      </T>
      <S d={arrow([[470, 162], [450, 204], [400, 240]], 1323, 10, 1)} i={7} c={YELLOW} w={1.8} t={0.4} />
      {/* you */}
      <S d={ring(80, 268, 16, 16, 1323, 1.05, 0.06)} i={8} t={0.3} />
      <S d={hand([[80, 284], [80, 336]], 1324, 0.4) + hand([[56, 302], [104, 302]], 1325, 0.4) + hand([[80, 336], [62, 372]], 1326, 0.4) + hand([[80, 336], [98, 372]], 1327, 0.4)} i={8.5} t={0.4} />
      <T x={80} y={402} i={9} s={24} a="middle">
        You
      </T>
      {/* house */}
      <S d={hand([[478, 262], [488, 362], [602, 362], [612, 262]], 1328, 1, 24)} i={8} w={2.6} t={0.6} />
      <S
        d={Array.from({ length: 6 }, (_, k) => hand([[496 + k * 18, 356], [506 + k * 18, 330]], 1330 + k, 0.3)).join('')}
        i={9}
        w={1.2}
        cls="faint"
      />
      <T x={545} y={318} i={9} s={30} a="middle" cls="chalkfont">
        House
      </T>
      <T x={545} y={398} i={10} s={22} a="middle">
        starts at $0
      </T>
      <S d={arrow([[124, 290], [462, 290]], 1340, 10, 0.8)} i={10} c={PINK} t={0.5} />
      <T x={292} y={278} i={11} s={22} a="middle" c={PINK}>
        you lose → House keeps it
      </T>
      <S d={arrow([[462, 330], [124, 330]], 1341, 10, 0.8)} i={12} c={MINT} t={0.5} />
      <T x={292} y={362} i={13} s={22} a="middle" c={MINT}>
        you win → House pays you
      </T>
    </Board>
  )
}

/* ---------- 3. when you win: share of profit kept vs move size ---------- */

const WX = (m: number) => 100 + (Math.log10(m) + 1) * 245
const WY = (k: number) => 330 - (k - 70) * 13.5
const WIN: [number, number, string][] = [
  [0.1, 74.2, '74.2%'],
  [0.5, 85.0, '85.0%'],
  [1, 86.6, '86.6%'],
  [5, 87.9, '87.9%'],
  [10, 88.0, '88.0%'],
]
const winCurve = smooth(WIN.map(([m, k]) => [WX(m), WY(k)] as Pt))

export function WinCurve() {
  const lbl: [number, number, 'start' | 'middle' | 'end'][] = [
    [WX(0.1) + 12, WY(74.2) + 30, 'start'],
    [WX(0.5) + 4, WY(85) + 36, 'middle'],
    [WX(1) + 18, WY(86.6) + 32, 'start'],
    [WX(5), WY(87.9) + 34, 'middle'],
    [WX(10), WY(88) - 14, 'end'],
  ]
  return (
    <Board name="win" vb="0 0 640 400" label="Share of your profit you keep after the price-impact cut and the 2% fee: 74.2% on a 0.1% move, 85.0% on 0.5%, 86.6% on 1%, 87.9% on 5%, 88.0% on 10%">
      <S d={arrow([[100, 342], [100, 30]], 1351, 10, 0.6)} i={0} t={0.5} />
      <S d={arrow([[90, 330], [630, 330]], 1352, 10, 0.6)} i={0.5} t={0.5} />
      {[70, 80, 90].map((k, j) => (
        <S key={k} d={hand([[93, WY(k)], [107, WY(k)]], 1353 + j, 0.3)} i={1} t={0.2} />
      ))}
      {[70, 80, 90].map((k) => (
        <T key={k} x={86} y={WY(k) + 8} i={1} s={22} a="end">
          {k}%
        </T>
      ))}
      <G d={`M102 ${WY(90)}H600`} i={2} />
      {WIN.map(([m], j) => (
        <S key={m} d={hand([[WX(m), 323], [WX(m), 337]], 1357 + j, 0.2)} i={1.5} t={0.2} />
      ))}
      {WIN.map(([m]) => (
        <T key={m} x={WX(m)} y={364} i={2} s={22} a="middle">
          {m}%
        </T>
      ))}
      <T x={630} y={396} i={2} s={22} a="end">
        price move (log scale)
      </T>
      <T x={116} y={30} i={1} s={22}>
        share of your profit you keep
      </T>
      <S d={winCurve} i={3} c={MINT} w={3.4} t={1.2} />
      {WIN.map(([m, k], j) => (
        <S key={m} d={ring(WX(m), WY(k), 5, 5, 1362 + j, 1.08, 0.1)} i={6 + j * 0.8} c={MINT} w={2.6} t={0.3} />
      ))}
      {WIN.map(([m, , l], j) => (
        <T key={m} x={lbl[j][0]} y={lbl[j][1]} i={6.5 + j * 0.8} s={22} a={lbl[j][2]} c={j === 2 ? YELLOW : MINT}>
          {l}
        </T>
      ))}
      <S d={arrow([[410, 222], [372, 170], [348, 140]], 1370, 9, 0.8)} i={11} c={YELLOW} w={1.8} t={0.4} />
      <T x={380} y={254} i={12} s={24} c={YELLOW}>
        +1%: $100 → $86.57
      </T>
      <T x={200} y={300} i={13} s={22}>
        bigger move → you keep more
      </T>
    </Board>
  )
}

/* ---------- 4. liquidation ---------- */

const liqPath = (() => {
  const r = rand(1381)
  const pts: Pt[] = []
  for (let k = 0; k <= 16; k++) {
    const x = 40 + k * 24.5
    const base = 92 + (k / 16) * 168
    pts.push([x, k === 16 ? 260 : base + Math.sin(k * 1.7) * 16 + (r() - 0.5) * 10])
  }
  return hand(pts, 1382, 0.6, 9)
})()

export function LiqChart() {
  const burst = Array.from({ length: 10 }, (_, k) => {
    const a = (k * Math.PI) / 5 + 0.15
    const r2 = k % 2 ? 15 : 24
    return hand([[432 + Math.cos(a) * 7, 260 + Math.sin(a) * 7], [432 + Math.cos(a) * r2, 260 + Math.sin(a) * r2]], 1390 + k, 0.2)
  }).join('')
  return (
    <Board name="liq" vb="0 0 640 360" label="1000x long opened at $80,000: the price only has to drop 0.052% to the liquidation price of $79,958.36, and the whole margin is lost; you mint $CHALK on the full margin">
      <G d="M30 86H610" i={0} />
      <T x={30} y={70} i={0} s={22}>
        entry $80,000
      </T>
      <G d="M30 260H610" i={1} c={PINK} />
      <T x={30} y={296} i={1} s={22} c={PINK}>
        liquidation $79,958.36
      </T>
      <T x={330} y={40} i={1} s={26} c={YELLOW}>
        1000x long
      </T>
      <S d={liqPath} i={2} w={2.8} t={1.2} />
      <S d={burst} i={8} c={PINK} w={2.4} t={0.3} />
      <S d={arrow([[600, 92], [600, 254]], 1401, 9, 0.4) + head([600, 92], [600, 254], 9)} i={9} c={YELLOW} w={1.8} t={0.4} />
      <T x={588} y={186} i={10} s={26} a="end" c={YELLOW}>
        −0.052%
      </T>
      <T x={630} y={306} i={11} s={22} a="end" c={PINK}>
        whole margin lost
      </T>
      <T x={630} y={340} i={12} s={22} a="end" c={MINT}>
        + $CHALK on the full margin
      </T>
    </Board>
  )
}

/* ---------- 5. the payout queue ---------- */

function Person({ x, y, seed, i, c }: { x: number; y: number; seed: number; i: number; c?: string }) {
  return (
    <S
      d={
        ring(x, y, 13, 13, seed, 1.05, 0.06) +
        hand([[x, y + 13], [x, y + 58]], seed + 1, 0.4) +
        hand([[x - 20, y + 30], [x + 20, y + 30]], seed + 2, 0.4) +
        hand([[x, y + 58], [x - 15, y + 88]], seed + 3, 0.4) +
        hand([[x, y + 58], [x + 15, y + 88]], seed + 4, 0.4)
      }
      i={i}
      c={c}
      t={0.5}
    />
  )
}

export function QueueDiagram() {
  return (
    <Board name="queue" vb="0 0 640 330" label="When the House can't pay a winner right away, winners wait in a first-in, first-out queue and are paid before anything else; nothing goes to $CHALK stakers while anyone is queued">
      <S d={hand([[20, 96], [28, 206], [140, 206], [148, 96]], 1411, 1, 24)} i={0} w={2.6} t={0.6} />
      <S d={Array.from({ length: 5 }, (_, k) => hand([[36 + k * 22, 200], [46 + k * 22, 176]], 1412 + k, 0.3)).join('')} i={1} w={1.2} cls="faint" />
      <T x={84} y={160} i={1} s={28} a="middle" cls="chalkfont">
        House
      </T>
      <T x={84} y={240} i={2} s={22} a="middle">
        new losses in
      </T>
      <S d={arrow([[84, 40], [84, 86]], 1418, 9, 0.4)} i={0.5} c={PINK} t={0.3} />
      <S d={arrow([[156, 140], [218, 140]], 1419, 10, 0.6)} i={3} c={MINT} t={0.4} />
      <T x={188} y={124} i={3} s={22} a="middle" c={MINT}>
        pays
      </T>
      {[0, 1, 2].map((k) => (
        <Person key={k} x={262 + k * 72} y={102} seed={1420 + k * 10} i={4 + k * 0.8} c={k === 0 ? MINT : undefined} />
      ))}
      {['1st', '2nd', '3rd'].map((l, k) => (
        <T key={l} x={262 + k * 72} y={84} i={4.5 + k * 0.8} s={22} a="middle" c={k === 0 ? MINT : undefined}>
          {l}
        </T>
      ))}
      <T x={334} y={226} i={7} s={22} a="middle">
        winners waiting
      </T>
      <G d="M470 52V236" i={7} c={PINK} />
      <S d={ring(560, 128, 40, 39, 1450, 1.1, 0.05)} i={8} c={MINT} w={2.4} t={0.5} />
      <T x={560} y={146} i={8.5} s={46} a="middle" c={MINT} cls="chalkfont">
        C
      </T>
      <T x={560} y={196} i={9} s={22} a="middle" c={MINT}>
        $CHALK stakers
      </T>
      <T x={560} y={224} i={9} s={22} a="middle" c={PINK}>
        wait
      </T>
      <S d={hand([[30, 266], [320, 262], [610, 266]], 1451, 1.4, 30)} i={10} w={1.4} cls="faint" />
      <T x={320} y={300} i={11} s={22} a="middle" c={YELLOW}>
        first in, first out — paid before anything else
      </T>
    </Board>
  )
}

/* ---------- 6. the House bucket and the cap ---------- */

export function BucketDiagram() {
  const fill = Array.from({ length: 11 }, (_, k) => {
    const x = 176 + k * 20
    return hand([[x, 318], [x + 14, 148]], 1460 + k, 0.4, 30)
  }).join('')
  return (
    <Board name="bucket" vb="0 0 640 380" label="The House fills from losses up to a cap: $1M to start. Above the cap, most of the overflow goes to $CHALK stakers and a share raises the cap; below it, the cap shrinks back, not under $1M. The House pays winners.">
      <S d={hand([[150, 80], [166, 330], [404, 330], [420, 80]], 1471, 1.1, 26)} i={0} w={3} t={0.7} />
      <S d={fill} i={1} w={1.2} cls="faint" t={0.6} />
      <G d="M154 140H416" i={2} c={YELLOW} />
      <T x={285} y={128} i={2} s={22} a="middle" c={YELLOW}>
        cap: $1M to start
      </T>
      <T x={285} y={252} i={3} s={44} a="middle" cls="chalkfont">
        House
      </T>
      <S d={arrow([[438, 196], [438, 128]], 1472, 9, 0.4)} i={4} c={YELLOW} w={2} t={0.3} />
      <T x={452} y={176} i={4} s={22} c={YELLOW}>
        grows when full,
      </T>
      <T x={452} y={202} i={4} s={22} c={YELLOW}>
        shrinks when not
      </T>
      <S d={arrow([[40, 24], [100, 50], [170, 104]], 1473, 10, 0.8)} i={5} c={PINK} t={0.4} />
      <T x={20} y={64} i={5} s={22} c={PINK}>
        losses in
      </T>
      <S d={arrow([[392, 104], [470, 74], [520, 78]], 1474, 10, 0.8)} i={6} c={MINT} t={0.4} />
      <S d={ring(574, 80, 34, 33, 1475, 1.1, 0.05)} i={7} c={MINT} w={2.2} t={0.4} />
      <T x={574} y={96} i={7.5} s={40} a="middle" c={MINT} cls="chalkfont">
        C
      </T>
      <T x={630} y={30} i={8} s={22} a="end" c={MINT}>
        above the cap: most
      </T>
      <S d={arrow([[170, 300], [100, 330], [50, 336]], 1476, 10, 0.8)} i={9} t={0.4} />
      <T x={20} y={370} i={9} s={22}>
        pays winners
      </T>
    </Board>
  )
}

/* ---------- 12 / 13. small doodles ---------- */

/* ---------- 11. epoch finale: the House split 80 / 10 / 10 ---------- */

export function FinaleDiagram() {
  const cx = 300, cy = 196, r = 112
  const pt = (deg: number): [number, number] => [cx + r * Math.sin((deg * Math.PI) / 180), cy - r * Math.cos((deg * Math.PI) / 180)]
  const [ax, ay] = pt(288), [bx, by] = pt(324)
  return (
    <Board
      name="finale"
      vb="0 0 640 400"
      label="Epoch finale: the redeem window opens 48 hours before the close. At the close the House splits 80% to redeemed $CHALK, which is burned, 10% to the operator and 10% stays for the next epoch."
    >
      <S d={ring(cx, cy, r, r - 3, 2101, 1.08, 0.03)} i={0} w={3} t={0.8} />
      <S d={hand([[cx, cy], [ax, ay]], 2102, 0.5)} i={1} w={2.2} />
      <S d={hand([[cx, cy], [bx, by]], 2103, 0.5)} i={1.2} w={2.2} />
      <S d={hand([[cx, cy], [cx, cy - r]], 2104, 0.5)} i={1.4} w={2.2} />
      <T x={cx + 10} y={cy + 26} i={2} s={58} a="middle" c={MINT} cls="chalkfont">
        80%
      </T>
      <T x={cx + 4} y={cy + 56} i={2.2} s={20} a="middle" c={MINT}>
        redeemed $CHALK
      </T>
      <T x={150} y={112} i={3} s={22} a="end" c={YELLOW}>
        10% operator
      </T>
      <S d={arrow([[154, 106], [212, 116], [236, 140]], 2105, 8, 0.6)} i={3} c={YELLOW} w={1.8} t={0.3} />
      <T x={400} y={52} i={3.5} s={22} c={BLUE}>
        10% stays in the House
      </T>
      <S d={arrow([[396, 58], [326, 74], [292, 100]], 2106, 8, 0.6)} i={3.5} c={BLUE} w={1.8} t={0.3} />
      <S d={hand([[40, 360], [600, 358]], 2107, 0.8)} i={4} w={1.6} cls="faint" />
      <S d={hand([[440, 346], [440, 372]], 2108, 0.3)} i={4.5} c={PINK} w={2.4} />
      <S d={hand([[580, 346], [580, 372]], 2109, 0.3)} i={4.5} c={PINK} w={2.4} />
      <T x={510} y={392} i={5} s={20} a="middle" c={PINK}>
        48 h redeem window
      </T>
      <T x={594} y={340} i={5.5} s={20} a="end">
        close
      </T>
      <S d={star(596, 312, 11, 2110)} i={6} c={YELLOW} w={1.8} />
    </Board>
  )
}

export function QuestionDoodle() {
  return (
    <Board name="qmark" vb="0 0 240 230" label="">
      <S d={ring(120, 112, 92, 88, 1481, 1.12, 0.04)} i={0} c={YELLOW} t={0.7} />
      <T x={120} y={158} i={1} s={140} a="middle" c={YELLOW} cls="chalkfont">
        ?
      </T>
      <S d={star(206, 28, 13, 1482)} i={2} w={1.8} />
      <S d={star(28, 196, 10, 1483)} i={3} c={MINT} w={1.6} />
    </Board>
  )
}

export function TestnetDoodle() {
  return (
    <Board name="testnet" vb="0 0 300 220" label="">
      <S d={box(20, 30, 200, 150, 1491, 1.3)} i={0} t={0.6} />
      {[62, 90, 118, 146].map((y, k) => (
        <S key={y} d={hand([[40, y], [40 + 150 - k * 22, y]], 1492 + k, 0.6)} i={1 + k * 0.5} w={1.6} cls="faint" />
      ))}
      <S d={ring(214, 160, 66, 40, 1497, 1.2, 0.06)} i={3} c={YELLOW} w={2.4} t={0.6} />
      <T x={214} y={169} i={4} s={25} a="middle" c={YELLOW} cls="chalkfont">
        contracts
      </T>
    </Board>
  )
}

/* ---------- 7. where the money goes (reused) ---------- */

export function FlowChart() {
  const hatch = Array.from({ length: 10 }, (_, k) => {
    const x = 242 + k * 19
    return hand([[x, 444], [x + 10, 420]], 960 + k, 0.3)
  }).join('')
  return (
    <Board
      name="flow2"
      vb="0 0 680 470"
      st={0.11}
      label="Winner's profit pays a 2% fee. A loser's loss goes 98% to the house and 2% to the fee. Each fee splits 1% to the operator and 1% to $CHALK stakers. House balance above the cap, $1M to start, goes mostly to $CHALK stakers; a share raises the cap. Payouts every 30 seconds, no minimum."
    >
      {/* sources */}
      <S d={box(10, 22, 190, 66, 941)} i={0} c={MINT} t={0.9} />
      <T x={105} y={63} i={1} s={25} a="middle" c={MINT}>
        Winner’s profit
      </T>
      <S d={box(10, 172, 190, 66, 942)} i={1} c={PINK} t={0.9} />
      <T x={105} y={213} i={2} s={25} a="middle" c={PINK}>
        Loser’s loss
      </T>
      {/* fee pot */}
      <S d={arrow([[204, 52], [246, 58], [276, 96]], 943, 10, 0.8)} i={3} />
      <T x={232} y={44} i={4} s={22} a="middle" c={YELLOW}>
        2%
      </T>
      <S d={arrow([[204, 206], [246, 200], [276, 166]], 944, 10, 0.8)} i={4} />
      <T x={236} y={236} i={5} s={22} a="middle" c={YELLOW}>
        2%
      </T>
      <S d={ring(334, 131, 58, 44, 945, 1.12, 0.05)} i={5} c={YELLOW} t={0.9} />
      <T x={334} y={126} i={6} s={30} a="middle" c={YELLOW}>
        2%
      </T>
      <T x={334} y={154} i={6} s={22} a="middle">
        fee
      </T>
      {/* destinations */}
      <S d={box(480, 22, 190, 62, 946)} i={7} t={0.9} />
      <T x={575} y={61} i={8} s={25} a="middle">
        Operator
      </T>
      <S d={box(480, 148, 190, 110, 947)} i={8} c={MINT} t={0.9} />
      <S d={box(486, 154, 178, 98, 948, 1.4)} i={9} c={MINT} w={1.2} />
      <T x={575} y={198} i={9} s={32} a="middle" c={MINT} cls="chalkfont">
        $CHALK
      </T>
      <T x={575} y={232} i={9} s={24} a="middle" c={MINT}>
        stakers
      </T>
      <S d={arrow([[394, 112], [432, 82], [474, 60]], 949, 10, 0.8)} i={10} />
      <T x={430} y={66} i={11} s={22} a="middle">
        1%
      </T>
      <S d={arrow([[394, 152], [432, 182], [474, 196]], 950, 10, 0.8)} i={11} c={MINT} />
      <T x={424} y={206} i={12} s={22} a="middle" c={MINT}>
        1%
      </T>
      {/* house bucket */}
      <S d={arrow([[96, 242], [104, 318], [150, 372], [214, 388]], 951, 10, 1)} i={12} c={PINK} />
      <T x={84} y={322} i={13} s={24} a="end" c={PINK}>
        98%
      </T>
      <S d={hand([[220, 284], [232, 450], [430, 450], [442, 284]], 952, 1, 26)} i={13} t={1} w={2.6} />
      <G d="M228 330H436" i={15} c={YELLOW} />
      <S d={hatch} i={15} w={1.2} cls="faint" />
      <T x={331} y={318} i={16} s={22} a="middle" c={YELLOW}>
        cap: $1M to start
      </T>
      <T x={331} y={406} i={16} s={34} a="middle" cls="chalkfont">
        House
      </T>
      <S d={arrow([[446, 300], [500, 290], [540, 266]], 953, 10, 0.8)} i={17} c={MINT} />
      <T x={472} y={330} i={18} s={22} c={MINT}>
        above cap:
      </T>
      <T x={472} y={354} i={18} s={22} c={MINT}>
        mostly
      </T>
      {/* payout clock */}
      <S d={ring(616, 330, 24, 24, 954, 1.08, 0.05)} i={19} c={BLUE} />
      <S d={hand([[616, 330], [616, 314]], 955, 0.2) + hand([[616, 330], [628, 336]], 956, 0.2)} i={20} c={BLUE} />
      <T x={575} y={404} i={21} s={22} a="middle" c={BLUE}>
        paid every 30 s
      </T>
      <T x={575} y={430} i={21} s={22} a="middle" c={BLUE}>
        no minimum
      </T>
    </Board>
  )
}

/* ---------- 8a. mint → stake → earn while fading ---------- */

export function StakeDiagram() {
  const sticks = [0, 1, 2].map((k) => box(34 + k * 34, 62 - (k % 2) * 4, 20, 64, 1501 + k, 0.6)).join('')
  const fadeSticks = [0, 1, 2, 3].map((k) => hand([[372 + k * 22, 168 - k * 4], [372 + k * 22, 112 + k * 10]], 1510 + k, 0.5)).join('')
  return (
    <Board
      name="stake"
      vb="0 0 640 300"
      label="New $CHALK lands unstaked in your chalk box: it does not earn and does not fade. When you stake it, it goes on the board, earns its share of every payout in USDG and fades with a 1-day half-life. Each stake is locked for 24 hours, then you can unstake."
    >
      {/* chalk box */}
      <S d={box(20, 40, 140, 104, 1500, 1.2)} i={0} t={0.6} />
      <S d={sticks} i={1} c={MINT} w={2} t={0.5} />
      <T x={90} y={180} i={2} s={24} a="middle">
        chalk box
      </T>
      <T x={90} y={208} i={2} s={22} a="middle" c={MINT}>
        unstaked
      </T>
      <T x={90} y={236} i={3} s={22} a="middle">
        no fade, no pay
      </T>
      {/* stake arrow */}
      <S d={arrow([[170, 92], [214, 70], [262, 84]], 1505, 10, 0.8)} i={3} c={YELLOW} w={2.4} t={0.4} />
      <T x={216} y={52} i={4} s={24} a="middle" c={YELLOW}>
        stake
      </T>
      <T x={216} y={130} i={4} s={22} a="middle">
        24 h lock
      </T>
      {/* board */}
      <S d={box(272, 40, 250, 150, 1506, 1.3)} i={5} w={2.6} t={0.6} />
      <S d={hand([[266, 196], [528, 194]], 1507, 0.6)} i={5.5} c="#a3aaa6" w={5} t={0.4} />
      <S d={fadeSticks} i={6} c={MINT} w={3} t={0.5} cls="fadeout" />
      <S d={hand([[296, 64], [340, 64]], 1514, 0.4) + hand([[296, 84], [330, 84]], 1515, 0.4)} i={6.5} w={1.6} cls="faint" />
      <T x={474} y={78} i={7} s={22} a="middle" c={YELLOW}>
        ×½ / day
      </T>
      <T x={397} y={232} i={7} s={24} a="middle">
        on the board
      </T>
      <T x={397} y={260} i={8} s={22} a="middle" c={MINT}>
        earns + fades
      </T>
      {/* usdc */}
      <S d={arrow([[528, 110], [566, 110]], 1508, 9, 0.5)} i={8} t={0.3} />
      <S d={ring(600, 110, 32, 32, 1509, 1.1, 0.05)} i={9} t={0.4} />
      <T x={600} y={124} i={9.5} s={38} a="middle" cls="chalkfont">
        $
      </T>
      <T x={600} y={170} i={10} s={22} a="middle">
        USDG
      </T>
    </Board>
  )
}

/* ---------- 8b. the half-life (reused) ---------- */

const HX = (t: number) => 80 + t * 160
const HY = (n: number) => 330 - 2.5 * n
const halfCurve = (() => {
  const r = rand(901)
  const pts: Pt[] = []
  for (let t = 0; t <= 3.32; t += 0.12) pts.push([HX(t) + (r() - 0.5) * 0.8, HY(100 * Math.pow(2, -t)) + (r() - 0.5) * 1.2])
  return smooth(pts)
})()

export function HalfLifeChart() {
  // [t days, value, label, label x, label y]
  const pts: [number, number, string, number, number][] = [
    [1 / 24, 97.2, '1 h: 97.2', 100, 82],
    [0.5, 70.7, '12 h: 70.7', 174, 146],
    [1, 50, '1 d: 50', 254, 196],
    [2, 25, '2 d: 25', 412, 256],
    [3, 12.5, '3 d: 12.5', 540, 282],
  ]
  return (
    <Board
      name="half"
      vb="0 0 640 400"
      label="Decay of 100 staked $CHALK with a 1-day half-life: 97.2 after 1 hour, 70.7 after 12 hours, 50 after 1 day, 25 after 2 days, 12.5 after 3 days, 0.8 after 7 days"
    >
      <S d={arrow([[80, 342], [80, 40]], 902, 10, 0.8)} i={0} t={0.8} />
      <S d={arrow([[70, 330], [628, 330]], 903, 10, 0.8)} i={1} t={0.8} />
      {[100, 50, 25].map((n, k) => (
        <S key={n} d={hand([[73, HY(n)], [87, HY(n)]], 904 + k, 0.3)} i={2} />
      ))}
      {[1, 2, 3].map((t, k) => (
        <S key={t} d={hand([[HX(t), 323], [HX(t), 337]], 908 + k, 0.3)} i={2} />
      ))}
      <S d={halfCurve} i={4} c={MINT} w={3.4} t={2.2} />
      {pts.slice(1).map(([t, n], k) => (
        <G key={t} i={14 + k} d={`M${f(HX(t))} ${f(HY(n) + 7)}V328`} />
      ))}
      {pts.map(([t, n], k) => (
        <S key={t} d={ring(HX(t), HY(n), 5, 5, 920 + k, 1.08, 0.1)} i={8 + k * 1.4} c={MINT} w={2.6} />
      ))}
      {pts.map(([t, , lbl, x, y], k) => (
        <T key={t} x={x} y={y} i={9 + k * 1.4} s={22} c={k < 2 ? undefined : MINT}>
          {lbl}
        </T>
      ))}
      {[100, 50, 25, 0].map((n) => (
        <T key={n} x={70} y={HY(n) + 7} i={2} s={22} a="end">
          {n}
        </T>
      ))}
      {['0', '1', '2', '3'].map((l, k) => (
        <T key={l} x={HX(k)} y={362} i={3} s={22} a="middle">
          {l}
        </T>
      ))}
      <T x={626} y={362} i={3} s={22} a="end">
        days
      </T>
      <T x={94} y={36} i={1} s={22}>
        staked $CHALK left (100 staked)
      </T>
      <T x={392} y={140} i={17} s={28} c={YELLOW}>
        ×½ every day
      </T>
      <S d={arrow([[452, 150], [470, 190], [452, 238]], 930, 9, 0.8)} i={18} c={YELLOW} w={2} />
      <S d={arrow([[600, 296], [632, 316]], 931, 8, 0.4)} i={19} c={MINT} w={2} />
      <T x={634} y={392} i={20} s={22} c={MINT} a="end">
        … 7 d: 0.8
      </T>
    </Board>
  )
}

/* ---------- 9. what a loser gets back (reused) ---------- */

const PX = (t: number) => 60 + t * 74
const PY = (k: number) => 400 - 118 * k
const payCurve = (() => {
  const r = rand(990)
  const pts: Pt[] = []
  for (let t = 0; t <= 7.01; t += 0.25) pts.push([PX(t) + (r() - 0.5) * 0.6, PY(1 - Math.pow(2, -t)) + (r() - 0.5) * 1.2])
  return smooth(pts)
})()

export function CashbackBoard() {
  const days: [number, string][] = [
    [0, '0'],
    [1, '1'],
    [7, '7 days'],
  ]
  return (
    <Board name="cash" vb="0 0 640 450" label="About 17 cents back per $1 lost; half of it arrives within a day and 99% within a week">
      <T x={36} y={150} i={0} s={150} c={YELLOW} cls="chalkfont big">
        ~17¢
      </T>
      <T x={380} y={92} i={2} s={34}>
        per $1
      </T>
      <T x={380} y={134} i={2} s={34}>
        lost
      </T>
      <S d={hand([[30, 172], [200, 166], [360, 174]], 991, 2, 30)} i={1} c={YELLOW} w={3.2} t={0.9} />
      <S d={hand([[60, 186], [220, 182], [330, 186]], 992, 1.6, 30)} i={2} c={YELLOW} w={2} />
      <S d={star(512, 56, 16, 993)} i={3} c={PINK} w={1.8} cls="faint" />
      {/* payback over a week */}
      <S d={arrow([[60, 408], [60, 250]], 995, 9, 0.6)} i={4} t={0.6} />
      <S d={arrow([[52, 400], [622, 400]], 996, 9, 0.6)} i={4} t={0.6} />
      <G d={`M62 ${PY(1)}H600`} i={5} c={YELLOW} />
      <T x={600} y={PY(1) - 8} i={5} s={22} a="end" c={YELLOW}>
        all 17¢
      </T>
      <S d={payCurve} i={6} c={MINT} w={3.2} t={1.8} />
      <G d={`M${PX(1)} ${PY(0.5) + 6}V398`} i={12} />
      <S d={ring(PX(1), PY(0.5), 5, 5, 997, 1.08, 0.1)} i={12} c={MINT} w={2.6} />
      <T x={PX(1) + 14} y={PY(0.5) + 26} i={13} s={22} c={MINT}>
        half within a day
      </T>
      <S d={ring(PX(7), PY(0.99), 5, 5, 998, 1.08, 0.1)} i={14} c={MINT} w={2.6} />
      <T x={PX(7) - 4} y={PY(0.99) + 32} i={15} s={22} a="end" c={MINT}>
        99% within a week
      </T>
      {days.map(([t, l]) => (
        <T key={l} x={PX(t)} y={428} i={5} s={22} a={t === 7 ? 'end' : 'middle'}>
          {l}
        </T>
      ))}
      <S d={hand([[PX(7), 394], [PX(7), 406]], 999, 0.2)} i={5} />
      <S d={hand([[PX(1), 394], [PX(1), 406]], 989, 0.2)} i={5} />
    </Board>
  )
}

/* ---------- 10. why the fade matters ---------- */

const lastsLines = (() => {
  const r = rand(1010)
  const gb: Pt[] = []
  const pt: Pt[] = []
  for (let k = 0; k <= 20; k++) {
    const x = 70 + k * 26
    gb.push([x, 128 + Math.sin(k * 1.3) * 5 + (r() - 0.5) * 3])
    pt.push([x, 250 - 205 * Math.exp(-k / 3.2) + (r() - 0.5) * 2])
  }
  return [smooth(gb), smooth(pt)]
})()

export function LastsSketch() {
  return (
    <Board name="lasts" vb="0 0 640 330" label="Sketch: Blackboard cashback stays flat for late entrants, while a token without decay pays later users less and less">
      <S d={arrow([[70, 270], [70, 20]], 1011, 9, 0.6)} i={0} t={0.6} />
      <S d={arrow([[62, 262], [612, 262]], 1012, 9, 0.6)} i={0} t={0.6} />
      <T x={84} y={22} i={1} s={22}>
        cashback
      </T>
      <T x={612} y={296} i={1} s={22} a="end">
        the later you join →
      </T>
      <S d={lastsLines[0]} i={2} c={MINT} w={3.2} t={1.6} />
      <S d={lastsLines[1]} i={3} c={PINK} w={3.2} t={1.6} />
      <T x={600} y={110} i={10} s={24} a="end" c={MINT}>
        Blackboard
      </T>
      <T x={600} y={160} i={11} s={22} a="end" c={MINT}>
        a ratio: holds steady
      </T>
      <T x={150} y={58} i={12} s={24} c={PINK}>
        token without decay
      </T>
      <T x={150} y={84} i={13} s={22} c={PINK}>
        a fixed pile, split ever thinner
      </T>
      <S d={arrow([[300, 96], [290, 150], [262, 196]], 1013, 8, 0.8)} i={13} c={PINK} w={1.6} cls="faint" />
    </Board>
  )
}

function IconRocket() {
  return (
    <Board name="icon" vb="0 0 120 110">
      <g transform="rotate(32 60 56)">
        <S d={hand([[48, 84], [48, 38], [53, 22], [60, 8], [67, 22], [72, 38], [72, 84], [48, 84]], 1101, 0.6, 12)} i={0} t={0.9} />
        <S d={ring(60, 44, 6, 6, 1102, 1.05, 0.08)} i={1} />
        <S d={hand([[48, 64], [36, 88], [48, 82]], 1103, 0.4, 8) + hand([[72, 64], [84, 88], [72, 82]], 1104, 0.4, 8)} i={2} />
        <S d={hand([[52, 90], [56, 104], [60, 94], [64, 108], [68, 92]], 1105, 0.5, 8)} i={3} c={PINK} />
      </g>
      <S d={star(100, 16, 8, 1106)} i={4} c={YELLOW} w={1.6} />
      <S d={star(16, 30, 6, 1107)} i={5} w={1.4} />
    </Board>
  )
}
function IconChart() {
  const c: [number, number, number, boolean][] = [
    [36, 66, 84, true],
    [62, 56, 72, false],
    [88, 38, 60, true],
  ]
  return (
    <Board name="icon" vb="0 0 120 110">
      <S d={hand([[16, 10], [16, 96], [112, 96]], 1111, 0.6, 14)} i={0} t={0.7} />
      {c.map(([x, t, b, up], k) => (
        <S key={x} d={hand([[x, t - 8], [x, b + 8]], 1112 + k, 0.3) + box(x - 6, t, 12, b - t, 1116 + k, 0.5)} i={1 + k} c={up ? MINT : PINK} w={2} />
      ))}
      <S d={arrow([[30, 40], [64, 30], [104, 10]], 1120, 9, 0.8)} i={6} c={YELLOW} w={2} />
      <T x={112} y={94} i={7} s={24} a="end">
        10x
      </T>
    </Board>
  )
}
function IconSprout() {
  return (
    <Board name="icon" vb="0 0 120 110">
      <S d={hand([[8, 96], [40, 94], [76, 97], [112, 95]], 1131, 1, 12)} i={0} t={0.6} />
      <S d={hand([[50, 95], [52, 70], [49, 44]], 1132, 0.6, 10)} i={1} c={MINT} />
      <S d="M50 62C34 62 24 52 22 38C38 36 48 46 50 62Z" i={2} c={MINT} w={2} />
      <S d="M50 50C58 34 72 28 84 30C82 46 66 54 50 50Z" i={3} c={MINT} w={2} />
      <S d={hand([[94, 76], [94, 30]], 1133, 0.3) + head([94, 30], [94, 76], 8)} i={4} c={MINT} w={2} />
      <S d={hand([[106, 30], [106, 76]], 1134, 0.3) + head([106, 76], [106, 30], 8)} i={5} c={PINK} w={2} />
    </Board>
  )
}

/* ---------- 11. who it's for ---------- */

export function WhoCards() {
  const cards: [ReactNode, string, ReactNode, string][] = [
    [
      <IconRocket key="r" />,
      '1000x gamblers',
      <>
        The lottery. Liquidation at about 0.05% hands the house roughly <b>40% of margin</b> per trade. These traders fund the system — and mint
        $CHALK on every loss.
      </>,
      'who-a',
    ],
    [
      <IconChart key="c" />,
      '10x traders',
      <>
        No edge? <b>0% fee</b> and about <b>17% loss cashback</b> beat Hyperliquid (about +2.5% vs −0.9% of margin per trade). Big winners still do
        better on Hyperliquid.
      </>,
      'who-b',
    ],
    [
      <IconSprout key="s" />,
      'Farmers',
      <>
        Hedged pairs cost about <b>13.4% of the loss</b> and earn cashback back — profitable while cashback stays above that. Their volume fills the
        leaderboard.
      </>,
      'who-c',
    ],
  ]
  return (
    <div className="who-cards">
      {cards.map(([icon, title, body, cls], k) => (
        <article key={cls} className={`who-card ${cls}`}>
          <svg className="cl who-frame rv" viewBox="0 0 400 300" preserveAspectRatio="none" aria-hidden="true" focusable="false" fill="none" stroke="currentColor">
            <S d={box(6, 6, 388, 288, 1140 + k, 1.6)} i={k * 2} w={2.2} t={1.2} />
          </svg>
          <div className="who-icon">{icon}</div>
          <h3 className="rv">{title}</h3>
          <p className="rv">{body}</p>
        </article>
      ))}
    </div>
  )
}

/* ---------- footer CTA ---------- */

export function FooterCta({ comingSoon = false }: { comingSoon?: boolean }) {
  return (
    <section className="lesson l-cta" aria-label="Start trading">
      <DStar cls="dc-f1" seed={81} c={YELLOW} />
      <DStar cls="dc-f2" seed={82} c={MINT} />
      <DText cls="dc-f3" vb="0 0 230 60">
        <T x={4} y={40} i={0} s={28} c={PINK}>
          loss → $CHALK
        </T>
      </DText>
      <DText cls="dc-f4" vb="0 0 200 60">
        <T x={4} y={40} i={0} s={28} c={MINT}>
          $CHALK → USDG
        </T>
      </DText>
      <h2 className="l-cta-h rv">Your turn at the board.</h2>
      <div className="l-cta-row">
        {comingSoon ? <ComingSoonTrade /> : <Link className="chalk-cta" to="/trade/btc">
          <svg className="cl rv" viewBox="0 0 400 110" preserveAspectRatio="none" aria-hidden="true" focusable="false" fill="none" stroke="currentColor">
            <S d={box(8, 10, 384, 90, 1201, 2)} i={0} c={YELLOW} w={3} t={1} />
            <S d={box(12, 6, 378, 96, 1202, 2.4)} i={2} c={YELLOW} w={1.6} t={1} />
          </svg>
          <span>Start trading</span>
        </Link>}
      </div>
    </section>
  )
}

/** end of the board: brand, links and testnet note, sitting on the aluminium ledge */
export function BoardFooter({ comingSoon = false }: { comingSoon?: boolean }) {
  return (
    <footer className="board-footer">
      <div className="bf-row">
        <div className="bf-brand">
          <Link to="/" className="bf-wm">
            Blackboard
          </Link>
          <p>Trade 1000x. Zero fees.</p>
        </div>
        <nav className="bf-links" aria-label="Footer">
          {comingSoon ? <ComingSoonTrade /> : <Link to="/trade/btc">Trade</Link>}
          {!comingSoon && <><Link to="/house">House</Link>
          <Link to="/staking">CHALK</Link>
          <Link to="/leaderboard">Leaderboard</Link></>}
          <a href="#what">Back to top ↑</a>
        </nav>
        <div className="bf-net">
          <span className="bf-chip">{comingSoon ? "Coming soon" : "Testnet"}</span>
          <p>{comingSoon ? "Trading is not available yet." : "The half-life model ships in v1; this testnet still runs v0 emissions + staking."}</p>
        </div>
      </div>
      <ChalkTray />
    </footer>
  )
}

/** the board's aluminium ledge with a few chalk sticks and a felt eraser */
export function ChalkTray() {
  const sticks: [number, number, string][] = [
    [9, -2, '#f4f3ec'],
    [15, 3, YELLOW],
    [74, -3, PINK],
    [88, 2, BLUE],
  ]
  return (
    <div className="chalk-tray" aria-hidden="true">
      <i className="tray-dust" />
      {sticks.map(([x, rot, c], k) => (
        <svg key={k} className="tray-stick" viewBox="0 0 80 14" style={v({ left: `${x}%`, '--r': `${rot}deg` })} focusable="false">
          <rect x="1" y="1" width="78" height="12" rx="4.5" fill={c} />
          <rect x="1" y="1" width="78" height="4" rx="2" fill="#fff" opacity=".35" />
          <path d="M70 1.5v11" stroke="rgba(0,0,0,.12)" strokeWidth="1" />
        </svg>
      ))}
      <svg className="tray-eraser" viewBox="0 0 150 46" focusable="false">
        <rect x="2" y="4" width="146" height="26" rx="5" fill="#2c3330" />
        <rect x="2" y="4" width="146" height="8" rx="4" fill="#3d4642" />
        <rect x="4" y="28" width="142" height="14" rx="3" fill="#cfd2cb" />
        <rect x="4" y="38" width="142" height="4" rx="2" fill="#9ea39c" />
        <text x="75" y="24" textAnchor="middle" fontSize="12" fill="#8ff0b0" opacity=".85">
          Blackboard
        </text>
      </svg>
    </div>
  )
}

