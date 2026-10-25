import { arrow, CHALK, hand, MINT, PINK, ring, S, star, T, YELLOW, type Pt } from './ChalkDoodles'
import type { ReactElement } from 'react'
import type { BbIconName } from './BbIcon'

/*
 * Small hand-drawn chalk sketches for empty tables (decorative, aria-hidden). Paths are built once at
 * module load from seeded jitter, like the landing doodles; `.ui-chalk` draws them in on mount.
 */

type Art = 'chart' | 'clock' | 'wallet' | 'smile' | 'stick'

const ART_OF: Partial<Record<BbIconName, Art>> = {
  history: 'chart', queue: 'clock', epoch: 'clock', countdown: 'clock', wallet: 'wallet', deposit: 'wallet', withdraw: 'wallet',
  chalk: 'stick', stake: 'stick', rewards: 'stick', user: 'smile', info: 'smile',
}

const frame = (seed: number) => hand([[8, 10], [112, 8], [114, 66], [6, 68], [8, 10]], seed, 1.2, 18)

const ARTS: Record<Art, ReactElement> = {
  // A flat line on an empty board: nothing traded yet.
  chart: <>
    <S d={frame(2101)} i={0} t={0.6} cls="faint" />
    <S d={hand([[18, 54], [44, 52], [64, 54], [100, 53]] as Pt[], 2102, 1.4)} i={1} c={MINT} />
    <S d={arrow([[30, 26], [52, 34], [70, 30]], 2103, 7)} i={2} c={YELLOW} w={1.8} />
    <T x={88} y={36} i={3} s={22} c={YELLOW} cls="chalkfont">?</T>
  </>,
  // A clock: history and queue fill up with time.
  clock: <>
    <S d={ring(60, 38, 26, 26, 2201, 1.12, 0.05)} i={0} t={0.6} />
    <S d={hand([[60, 38], [60, 22]], 2202, 0.4, 6)} i={1} c={YELLOW} w={2} />
    <S d={hand([[60, 38], [72, 44]], 2203, 0.4, 6)} i={1.5} c={YELLOW} w={2} />
    <S d={star(100, 16, 7, 2204)} i={2} c={MINT} w={1.4} />
    <T x={14} y={64} i={3} s={14} c={CHALK} cls="chalkfont">zzz</T>
  </>,
  // An open, empty wallet.
  wallet: <>
    <S d={hand([[22, 22], [96, 20], [98, 60], [20, 62], [22, 22]], 2301, 1.1, 16)} i={0} t={0.6} />
    <S d={hand([[74, 34], [100, 34], [100, 48], [74, 48], [74, 34]], 2302, 0.6, 10)} i={1} c={YELLOW} w={1.8} />
    <S d={ring(84, 41, 2.5, 2.5, 2303)} i={2} c={YELLOW} w={1.6} />
    <S d={star(16, 12, 6, 2304)} i={3} c={PINK} w={1.4} />
  </>,
  // A chalk stick and its first stroke: no CHALK activity yet.
  stick: <>
    <S d={hand([[30, 46], [80, 22], [86, 34], [36, 58], [30, 46]], 2601, 0.6, 10)} i={0} t={0.6} />
    <S d={hand([[80, 22], [86, 34]], 2602, 0.3, 6)} i={1} c={YELLOW} w={2} />
    <S d={hand([[18, 64], [44, 61], [70, 64], [100, 60]], 2603, 1.2)} i={2} c={YELLOW} w={1.8} />
    <S d={star(100, 16, 7, 2604)} i={3} c={MINT} w={1.4} />
    <S d={star(16, 20, 5, 2605)} i={3.5} c={PINK} w={1.2} />
  </>,
  // A shrugging smiley.
  smile: <>
    <S d={ring(60, 38, 24, 24, 2401, 1.1, 0.05)} i={0} t={0.6} />
    <S d={ring(52, 33, 1.6, 1.6, 2402)} i={1} w={2.4} />
    <S d={ring(68, 33, 1.6, 1.6, 2403)} i={1} w={2.4} />
    <S d={hand([[50, 46], [60, 49], [70, 46]], 2404, 0.6, 6)} i={2} c={YELLOW} w={2} />
    <S d={star(100, 14, 7, 2405)} i={3} c={MINT} w={1.4} />
    <S d={star(18, 60, 5, 2406)} i={3.5} c={PINK} w={1.2} />
  </>,
}

export function ChalkEmpty({ icon, size = 'md' }: { icon?: BbIconName | null; size?: 'sm' | 'md' }) {
  const art = (icon && ART_OF[icon]) || 'chart'
  return (
    <svg className={`ui-chalk ui-chalk--${size}`} viewBox="0 0 120 72" fill="none" stroke="currentColor" aria-hidden focusable="false">
      {ARTS[art]}
    </svg>
  )
}

const box = (x: number, y: number, w: number, h: number, seed: number) => hand([[x, y], [x + w, y], [x + w, y + h], [x, y + h], [x, y]], seed, 0.5, 8)
/** Rising candles: [x, body top, body bottom, wick top, wick bottom, up?]. */
const CANDLES: [number, number, number, number, number, boolean][] = [
  [52, 112, 128, 104, 136, true], [76, 104, 120, 96, 126, false], [100, 96, 116, 88, 122, true], [124, 88, 104, 80, 110, true],
  [148, 92, 106, 84, 114, false], [172, 74, 94, 66, 100, true], [196, 64, 82, 56, 90, true], [220, 70, 84, 62, 92, false], [244, 50, 70, 42, 76, true],
]

/** Portfolio without a wallet: a chalkboard with rising candles, a trend arrow and the tray below. */
export function ChalkDesk() {
  return (
    <svg className="ui-chalk pf-desk-art" viewBox="0 0 320 190" fill="none" stroke="currentColor" aria-hidden focusable="false">
      <S d={hand([[14, 14], [306, 12], [308, 156], [12, 158], [14, 14]], 2701, 1.2, 24)} i={0} t={0.8} cls="faint" />
      <S d={hand([[30, 142], [292, 140]], 2702, 0.6, 26)} i={0.6} t={0.5} cls="faint" />
      {CANDLES.map(([x, t, b, wt, wb, up], k) => <g key={x} className="pf-desk-candle" style={{ animationDelay: `${2.6 + k * 0.18}s` }}>
        <S d={hand([[x + 6, wt], [x + 6, wb]], 2710 + k, 0.3, 6)} i={1 + k * 0.25} t={0.25} c={up ? MINT : PINK} w={1.4} />
        <S d={box(x, t, 12, b - t, 2730 + k)} i={1.1 + k * 0.25} t={0.35} c={up ? MINT : PINK} w={1.8} />
      </g>)}
      <g className="pf-desk-glow"><S d={arrow([[40, 98], [120, 72], [196, 46], [262, 26]], 2750, 12, 1.2)} i={3.6} t={0.8} c={YELLOW} w={2.4} /></g>
      <g className="pf-desk-glow"><T x={276} y={128} i={4.4} s={18} c={YELLOW} a="middle" cls="chalkfont">1000x</T></g>
      <S d={ring(44, 40, 13, 13, 2760, 1.15, 0.05)} i={4.6} c={CHALK} w={1.8} />
      <T x={44} y={47} i={4.8} s={18} c={CHALK} a="middle" cls="chalkfont">$</T>
      <g className="pf-desk-twinkle"><S d={star(288, 64, 7, 2770)} i={5} c={MINT} w={1.4} /></g>
      <g className="pf-desk-twinkle" style={{ animationDelay: '4.2s' }}><S d={star(78, 28, 5, 2771)} i={5.2} c={PINK} w={1.2} /></g>
      <S d={hand([[20, 168], [300, 166]], 2780, 0.8, 30)} i={0.4} t={0.6} />
      <S d={box(232, 172, 34, 8, 2781)} i={5.4} c={CHALK} w={1.6} />
      <S d={box(270, 173, 18, 7, 2782)} i={5.6} c={YELLOW} w={1.6} />
    </svg>
  )
}
