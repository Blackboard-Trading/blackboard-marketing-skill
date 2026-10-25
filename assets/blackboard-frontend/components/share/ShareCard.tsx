import { useEffect, useRef } from 'react'
import { BRAND, priceDecimals, sym } from '../../lib/config'
import { fmtDuration, fmtNum, fmtPrice } from '../../lib/format'
import type { ShareTradeModel } from '../../lib/share'
import type { ChartPoint, ChartSeries } from '../../lib/share-chart'
import { fmtRoi, fmtSignedUsd, toneOf } from '../../lib/trade-math'
import { artSvg, chalkYellow, type ArtId } from './art'

export const TONE = { pos: '#8ff0b0', neg: '#ffa0ad', zero: '#efeee6' } as const
const TAGLINE = 'Trade 1000×. Zero fees.'
const INK = '#efeee6', LABEL = '#8f9597', LIQ = '#ed776a'
// About 16:10, like a phone screenshot: room for the chart without crowding.
const W = 600, H = 380, S = 2
export const CARD_PX = { w: W * S, h: H * S }
const L = 31, R = W - 31
const HEAD_Y = 62, STATS_Y = 336
const ART = { x: W - 16 - 236, y: 92, w: 236, h: 226 }
// With a chart: hero on top, the chart across the card, the art large and faint behind it.
const CHART = { x: L, y: 172, w: R - L, h: 132 }
const ART_BEHIND = { x: W - 12 - 262, y: 74, w: 262, h: 250, alpha: 0.15 }
const HERO_CHART_PX = 72
const HERO_PX = 84
const SUB_PX = 22
const SUB_FONT = (px: number) => `600 ${px}px 'JetBrains Mono'`
// Cabin Sketch has no U+2212 minus; Patrick Hand supplies it.
const HERO_FONT = (px: number) => `700 ${px}px 'Cabin Sketch', 'Patrick Hand', cursive`
// Canvas text does not request web fonts, so every face the card uses is loaded explicitly.
const FONTS = [HERO_FONT(80), "400 17px 'Patrick Hand'", '500 11px Inter', '700 11px Inter', '700 24px Inter', "600 20px 'JetBrains Mono'", "700 12px 'JetBrains Mono'"]
let fontsLoaded: Promise<unknown> | null = null
const loadFonts = () => (fontsLoaded ??= Promise.all(FONTS.map((f) => document.fonts.load(f))))

export type ShareDisplay = 'pnl' | 'roi' | 'both'

interface ShareCardProps {
  model: ShareTradeModel
  display: ShareDisplay
  art: ArtId
  chart: ChartSeries | null
  /** Clock for an open position's held time. */
  now: number
}

function content(model: ShareTradeModel, display: ShareDisplay, now: number) {
  const roi = fmtRoi(model.roi), pnl = fmtSignedUsd(model.pnl)
  const stats: { label: string; value: string; gold?: boolean }[] = [
    { label: 'Entry', value: model.entry === null ? '--' : fmtPrice(model.entry, priceDecimals(model.coin)) },
    { label: model.liquidated ? 'Liquidated' : 'Exit', value: model.exit === null ? (model.liquidated ? '--' : 'Open') : fmtPrice(model.exit, priceDecimals(model.coin)) },
  ]
  if (model.openedAt !== null && model.openedAt > 0) stats.push({ label: 'Held', value: fmtDuration(((model.closedAt ?? now) - model.openedAt) / 1000) })
  const minted = model.exit !== null && model.minted !== null && model.minted > 0 ? '+' + fmtNum(model.minted, 2) : null
  if (minted) stats.push({ label: `${sym().token} minted`, value: minted, gold: true })
  return { label: display === 'roi' ? 'ROI' : 'PnL', hero: display === 'roi' ? roi : pnl, sub: display === 'both' ? roi : null, stats }
}

export const shareSummary = (model: ShareTradeModel, display: ShareDisplay) => {
  const { hero, sub } = content(model, display, Date.now())
  return `${model.coin} ${model.side === 'long' ? 'Long' : 'Short'} ${model.leverage}× · ${hero}${display === 'roi' ? ' ROI' : ''}${sub ? ` (${sub} ROI)` : ''}`
}

const images = new Map<string, Promise<HTMLImageElement>>()
function loadImage(src: string) {
  let p = images.get(src)
  if (!p) {
    const img = new Image()
    img.src = src
    p = img.decode().then(() => img)
    images.set(src, p)
  }
  return p
}

const rgba = (hex: string, a: number) => `rgba(${parseInt(hex.slice(1, 3), 16)},${parseInt(hex.slice(3, 5), 16)},${parseInt(hex.slice(5, 7), 16)},${a})`
const sideTone = (m: ShareTradeModel) => (m.side === 'long' ? TONE.pos : TONE.neg)

/** "ETH 125× LONG" as plain text, side in its direction colour, then a chalk stamp when liquidated. */
function drawHead(c: CanvasRenderingContext2D, m: ShareTradeModel) {
  c.font = '700 24px Inter'
  let x = L
  for (const [text, color] of [[m.coin, INK], [`${m.leverage}×`, INK], [m.side === 'long' ? 'LONG' : 'SHORT', sideTone(m)]] as const) {
    c.fillStyle = color; c.fillText(text, x, HEAD_Y); x += c.measureText(text).width + 10
  }
  if (m.liquidated) {
    c.save()
    c.font = "700 15px 'Cabin Sketch'"; const tw = c.measureText('LIQUIDATED').width
    c.translate(x + 8 + tw / 2 + 9, HEAD_Y - 9); c.rotate(-0.07)
    c.strokeStyle = LIQ; c.fillStyle = LIQ
    c.lineWidth = 2; c.beginPath(); c.roundRect(-tw / 2 - 9, -13, tw + 18, 26, 5); c.stroke()
    c.lineWidth = 1; c.beginPath(); c.roundRect(-tw / 2 - 5.5, -9.5, tw + 11, 19, 3); c.stroke()
    c.textAlign = 'center'; c.fillText('LIQUIDATED', 0, 5.5)
    c.restore()
  }
}

/** Logo top right with the tagline under it. */
function drawBrand(c: CanvasRenderingContext2D) {
  c.textAlign = 'right'
  c.fillStyle = INK; c.font = "700 28px 'Cabin Sketch'"; c.fillText(BRAND, R, HEAD_Y)
  c.fillStyle = chalkYellow(); c.font = "400 17px 'Patrick Hand'"; c.fillText(TAGLINE, R, HEAD_Y + 24)
  c.textAlign = 'left'
}

/** Draws the W×H card at 2× (CARD_PX). The preview and the PNG are the same canvas, so they cannot drift. */
async function drawCard(p: ShareCardProps): Promise<HTMLCanvasElement> {
  await loadFonts()
  const tone = TONE[toneOf(p.model.roi)]
  const box = p.chart ? ART_BEHIND : ART
  const svg = artSvg(p.art, tone, 'png', box.w * S, box.h * S, !!p.chart)
  const art = svg ? await loadImage('data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg)) : null
  const t = content(p.model, p.display, p.now)
  const cv = document.createElement('canvas')
  cv.width = W * S; cv.height = H * S
  const c = cv.getContext('2d')!
  c.scale(S, S)
  c.fillStyle = '#141617'; c.fillRect(0, 0, W, H)
  c.fillStyle = '#1b1d1e'; c.fillRect(7, 7, W - 14, H - 14)
  const g1 = c.createRadialGradient(W * .22, H * .3, 0, W * .22, H * .3, W * .35)
  g1.addColorStop(0, 'rgba(239,238,230,.06)'); g1.addColorStop(1, 'rgba(239,238,230,0)')
  c.fillStyle = g1; c.fillRect(7, 7, W - 14, H - 14)
  c.textBaseline = 'alphabetic'
  if (art) {
    if (p.chart) c.globalAlpha = ART_BEHIND.alpha
    c.drawImage(art, box.x, box.y, box.w, box.h); c.globalAlpha = 1
  }
  drawHead(c, p.model)
  drawBrand(c)
  // The hero (and ROI beside it) shrink together so long values never leave their room.
  const heroPx = p.chart ? HERO_CHART_PX : HERO_PX
  const room = p.chart || !art ? R - L : ART.x - 24 - L
  const base = p.chart ? 150 : t.sub ? 206 : 226
  c.font = HERO_FONT(heroPx); const hw = c.measureText(t.hero).width
  c.font = SUB_FONT(SUB_PX); const sw = t.sub && p.chart ? c.measureText(t.sub).width + 18 : 0
  const k = Math.min(1, room / (hw + sw))
  c.fillStyle = tone; c.font = HERO_FONT(heroPx * k); c.fillText(t.hero, L - 2, base)
  if (t.sub) {
    c.font = SUB_FONT(SUB_PX); const sub = Math.min(SUB_PX * (p.chart ? k : 1), SUB_PX * room / c.measureText(t.sub).width)
    c.font = SUB_FONT(sub)
    if (p.chart) c.fillText(t.sub, L - 2 + (hw + 18) * k, base)
    else c.fillText(t.sub, L, base + 38)
  }
  if (p.chart) drawChart(c, p.chart, tone, p.model)

  // Stats share the width in equal columns, the last one right-aligned.
  const n = t.stats.length, colW = (R - L) / n
  t.stats.forEach((s, i) => {
    const last = n > 1 && i === n - 1, x = last ? R : L + i * colW
    c.textAlign = last ? 'right' : 'left'
    c.fillStyle = LABEL; c.font = '500 11px Inter'; c.fillText(s.label, x, STATS_Y)
    c.font = SUB_FONT(18); const vw = c.measureText(s.value).width
    c.fillStyle = s.gold ? chalkYellow() : '#e4e6e3'; c.font = SUB_FONT(Math.min(18, 18 * (colW - 14) / vw)); c.fillText(s.value, x, STATS_Y + 22)
  })
  c.textAlign = 'left'
  return cv
}

function drawChart(c: CanvasRenderingContext2D, s: ChartSeries, tone: string, m: ShareTradeModel) {
  const { x, y, w, h } = CHART
  const pad = (s.hi - s.lo) * 0.12 || s.hi * 0.0005
  const lo = s.lo - pad, hi = s.hi + pad
  const X = (t: number) => x + ((t - s.from) / (s.to - s.from || 1)) * w
  const Y = (v: number) => y + h - ((v - lo) / (hi - lo)) * h
  const trace = (pts: ChartPoint[]) => pts.forEach((q, i) => (i ? c.lineTo(X(q.t), Y(q.p)) : c.moveTo(X(q.t), Y(q.p))))
  const x0 = X(s.entry.t), x1 = X(s.exit.t), ye = Y(s.entry.p)
  const inTrade = (draw: () => void) => { c.save(); c.beginPath(); c.rect(x0, y - 16, Math.max(1, x1 - x0), h + 32); c.clip(); draw(); c.restore() }
  // Strongest at the price extremes, clear at the entry level.
  const f = Math.min(1, Math.max(0, (ye - y) / h))
  const grad = c.createLinearGradient(0, y, 0, y + h)
  grad.addColorStop(0, rgba(tone, 0.3)); grad.addColorStop(f, rgba(tone, 0)); grad.addColorStop(1, rgba(tone, 0.3))
  inTrade(() => {
    c.fillStyle = grad
    // One shape across gaps, so a gap leaves no hard vertical edges in the tint.
    const all = s.segments.flat()
    c.beginPath(); trace(all); c.lineTo(X(all[all.length - 1].t), ye); c.lineTo(X(all[0].t), ye); c.closePath(); c.fill()
  })
  c.strokeStyle = 'rgba(239,238,230,.2)'; c.lineWidth = 1.2; c.setLineDash([2, 4]); c.beginPath(); c.moveTo(x, ye); c.lineTo(x + w, ye); c.stroke(); c.setLineDash([])
  c.lineJoin = 'round'; c.lineCap = 'round'
  // A feed gap is bridged by a faint dotted line: missing data, not a price move.
  c.strokeStyle = 'rgba(239,238,230,.3)'; c.lineWidth = 1.4; c.setLineDash([1, 5])
  s.segments.slice(1).forEach((seg, i) => { const a = s.segments[i][s.segments[i].length - 1]; c.beginPath(); c.moveTo(X(a.t), Y(a.p)); c.lineTo(X(seg[0].t), Y(seg[0].p)); c.stroke() })
  c.setLineDash([])
  c.strokeStyle = 'rgba(239,238,230,.32)'; c.lineWidth = 1.4
  for (const seg of s.segments) { c.beginPath(); trace(seg); c.stroke() }
  inTrade(() => {
    c.strokeStyle = INK; c.lineWidth = 2
    for (const seg of s.segments) { c.beginPath(); trace(seg); c.stroke() }
  })
  // Buy / sell letters like an order ticket; L marks a liquidation, an open position ends on a plain dot.
  const long = m.side === 'long'
  marker(c, x0, ye, long ? 'B' : 'S', long ? TONE.pos : TONE.neg)
  if (m.liquidated) marker(c, x1, Y(s.exit.p), 'L', LIQ)
  else marker(c, x1, Y(s.exit.p), m.exit === null ? '' : long ? 'S' : 'B', long ? TONE.neg : TONE.pos)
}

function marker(c: CanvasRenderingContext2D, x: number, y: number, letter: string, color: string) {
  c.fillStyle = color; c.strokeStyle = '#1b1d1e'; c.lineWidth = 2.5
  c.beginPath(); c.arc(x, y, letter ? 10 : 6, 0, Math.PI * 2); c.fill(); c.stroke()
  if (!letter) return
  c.fillStyle = '#1b1d1e'; c.font = '700 11px Inter'; c.textAlign = 'center'; c.fillText(letter, x, y + 4); c.textAlign = 'left'
}

export async function renderShareCardPng(p: ShareCardProps): Promise<Blob> {
  const cv = await drawCard(p)
  return await new Promise<Blob>((res, rej) => cv.toBlob((b) => (b ? res(b) : rej(new Error('PNG export failed'))), 'image/png'))
}

export function ShareCard({ width, ...p }: ShareCardProps & { width: number }) {
  const ref = useRef<HTMLCanvasElement>(null)
  const { model, display, art, chart, now } = p
  useEffect(() => {
    let live = true
    void drawCard({ model, display, art, chart, now }).then((cv) => {
      const out = ref.current?.getContext('2d')
      if (!live || !out) return
      out.clearRect(0, 0, W * S, H * S)
      out.drawImage(cv, 0, 0)
    })
    return () => { live = false }
  }, [model, display, art, chart, now])
  const c = content(model, display, now)
  const label = `Share card: ${model.coin} ${model.side} ${model.leverage}×${model.liquidated ? ', liquidated' : ''}, ${c.label} ${c.hero}${c.sub ? ', ROI ' + c.sub : ''}${c.stats.map((s) => `, ${s.label} ${s.value}`).join('')}${chart ? ', with a price chart from entry to ' + (model.exit === null ? 'now' : 'exit') : ''}`
  return <canvas ref={ref} className="bb-sharecard" width={W * S} height={H * S} role="img" aria-label={label} style={{ width, height: Math.round(width * H / W) }} />
}

export function ShareArtThumb({ art, roi, uid }: { art: ArtId; roi: number; uid: string }) {
  const svg = artSvg(art, TONE[toneOf(roi)], uid)
  return svg ? <span className="sh-thumb-art" aria-hidden dangerouslySetInnerHTML={{ __html: svg }} /> : <span className="sh-thumb-none" aria-hidden />
}
