// Live Tick canvas: mapped markets use the price stream; others retain Hyperliquid BBO and backend history.
//  - streamed history and markers share source times; one temporary head holds the last price in 150 ms steps;
//  - each report replaces that head; its source-time extension is capped at one second;
//  - legacy BBO points use 125 ms buckets and ease only the newest point in value and time;
//  - the time axis scrolls continuously instead of stepping;
//  - the price range auto-fits the visible window and glides to new bounds instead of snapping;
//  - drag pans, wheel or pinch zooms (10 s to 5 min), double click resets; Live follows again.
// Display only. Trades execute at the oracle price the contract verifies, with all profit deductions.
import { useEffect, useRef, useState } from 'react'
import { fmtTime } from '../../lib/format'
import { priceStreamMarket, priceStreamStore } from '../../lib/price-stream'
import { chartTick, streamFreshness, type StreamState } from '../../lib/price-stream-state'
import { TickDisplayTrail } from '../../lib/tick-display-trail'
import { getTicks, onTick, seedTicks } from '../../lib/chart-ticks'
import { createStore } from '../../lib/store'
import { priceDecimals } from '../../lib/config'
import type { Position } from '../../lib/types'
import type { Fill } from '../../lib/fills'
import { C, rgba } from './lw'
import { Button, reducedMotion } from '../primitives'

/** Order-panel preview (pulsing LIQ line for the trade being configured). Written by the order panel. */
export const chartPreview = createStore<{ coin: string | null; bust: number | null }>({ coin: null, bust: null })

const SPAN_MS = 25_000 // visible history
const MIN_SPAN_MS = 10_000
const ANCHOR = 0.9 // "now" sits at 90 % of the plot width
export const TICK_GUTTER = 66 // right price axis
const AXIS_H = 26 // bottom time axis
const EASE_MS = 120
const BUCKET_MS = 125
const KEEP_MS = 5 * 60_000
const FONT = "400 11px Lato, system-ui, sans-serif"
const TIP_FONT = "400 13px Lato, system-ui, sans-serif"
const TIP_BOLD = "700 13px Lato, system-ui, sans-serif"
// --color-line-grid at 50%
const TIP_LINE = "rgba(65,65,65,.5)"
const LABEL_H = 16
const LOW_FPS_MS = 1000 / 30 - 1

type Pt = { t: number; p: number }

function niceStep(range: number, target: number) {
  const raw = range / Math.max(1, target)
  const mag = 10 ** Math.floor(Math.log10(raw))
  const n = raw / mag
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * mag
}

export function TickChart({ coin, positions, liveKey = 0, spanMs = SPAN_MS, fills = [] }: { coin: string; positions: Position[]; liveKey?: number; spanMs?: number; fills?: Fill[] }) {
  const host = useRef<HTMLDivElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  const posRef = useRef(positions)
  const goLive = useRef(() => {})
  const [ready, setReady] = useState(false)
  const [historyError, setHistoryError] = useState(false)
  const [retry, setRetry] = useState(0)
  posRef.current = positions
  const fillsRef = useRef(fills)
  fillsRef.current = fills
  const dp = priceDecimals(coin)

  useEffect(() => {
    const cv = canvas.current
    const box = host.current
    if (!cv || !box) return
    const ctx = cv.getContext('2d')
    if (!ctx) return
    setReady(false)
    setHistoryError(false)

    const fmt = (p: number) => p.toLocaleString('en-US', { minimumFractionDigits: dp, maximumFractionDigits: dp })
    const eps = 10 ** -dp * 0.01
    const clock = () => performance.timeOrigin + performance.now()

    // ---- state
    let alive = true
    let w = 0
    let h = 0
    let trail: Pt[] = []
    const displayTrail = new TickDisplayTrail()
    let displaySource: StreamState | null = null
    let target = NaN // latest raw microprice
    let head = NaN // eased value of the newest point
    let headT = NaN // eased time of the newest point
    let prevDistinct = NaN // previous different raw mid (direction colour)
    const y = { lo: 0, hi: 0, tlo: 0, thi: 0, init: false }
    let lastTs = 0
    let raf = 0
    // Weak devices and reduced motion draw at most 30 fps; the line still glides, just with fewer frames.
    const noAnimation = reducedMotion()
    const lowFps = (navigator.hardwareConcurrency || 8) <= 4 || noAnimation
    const hover = { x: -1, y: -1 }
    // Left edge time while panned; null follows live
    let pinned: number | null = null
    let viewSpan = spanMs
    const view = { from: 0, pxPerMs: 1 }
    const drag = { id: -1, x: 0, from: 0 }
    const touches = new Map<number, number>()
    const pinch = { d: 0, span: 0, at: 0 }

    // ---- data
    const streamed = !!priceStreamMarket(coin)
    let unTick = () => {}
    if (streamed) {
      let reset = -1
      let seen: object | null = null
      const receive = () => {
        const state = priceStreamStore.get()
        if (state.symbol !== coin || seen === state.board) return
        seen = state.board
        const resetHistory = reset !== state.board.data.reset
        if (resetHistory) {
          reset = state.board.data.reset
          trail = []
          head = headT = target = prevDistinct = NaN
          y.init = false
          pinned = null
          setReady(false)
        }
        // Preserve source event times and replace the trail on snapshots and corrections.
        trail = state.board.data.ticks.map(chartTick)
        const market = priceStreamMarket(coin)!
        const backup = state.board.backup
        const backupFresh = backup && streamFreshness({ ...state.board.data, latest: backup.tick, sourceStatus: backup.sourceStatus }, Date.now(), market.staleAfterMs) === 'live'
        const current = backupFresh ? backup.tick : state.board.data.latest
        const next = current ? chartTick(current) : trail.at(-1)
        displaySource = backupFresh ? { ...state.board.data, latest: backup.tick, sourceStatus: backup.sourceStatus } : state.board.data
        // A current quote is a display head, never written into retained tick history.
        const last = trail.at(-1)
        if (next && (!last || (next.t >= last.t && (next.t !== last.t || next.p !== last.p)))) trail.push(next)
        trail = displayTrail.replaceHistory(trail, clock(), resetHistory)
        if (!next) return
        if (!Number.isNaN(target) && Math.abs(next.p - target) > eps) prevDistinct = target
        target = next.p
        if (Number.isNaN(head)) { head = next.p; headT = next.t }
        setReady(true)
      }
      unTick = priceStreamStore.subscribe(receive)
      receive()
    } else {
      // The buffered ticks (lib/chart-ticks keeps the last 5 minutes): the session's live ticks at once, then the
      // backend's history before them once it loads.
      const buffered = () => {
        const now = clock()
        const hist = getTicks(coin).filter((t) => t.t > now - KEEP_MS)
        const last = hist[hist.length - 1]
        const skew = last && last.t > now ? last.t - now + 50 : 0
        return hist.map((t) => ({ t: t.t - skew, p: t.m ?? t.p }))
      }
      trail = buffered()
      if (trail.length) target = head = trail[trail.length - 1].p
      void seedTicks(coin).then(() => {
        if (!alive) return
        const firstLive = trail[0]?.t ?? Infinity
        // History is sampled ~1/s; turn each change into a short ramp so old data reads like the live trail.
        const seeded: Pt[] = []
        for (const t of buffered()) {
          if (t.t >= firstLive) break
          const prev = seeded[seeded.length - 1]
          if (prev && Math.abs(t.p - prev.p) > eps && t.t - prev.t > 300) seeded.push({ t: t.t - 250, p: prev.p })
          seeded.push(t)
        }
        trail = [...seeded, ...trail]
        if (Number.isNaN(target) && seeded.length) target = head = seeded[seeded.length - 1].p
      }).catch(() => { if (alive) setHistoryError(true) })
      unTick = onTick((c, t) => {
        if (c !== coin) return
        const px = t.m ?? t.p // microprice, like papertrade's tick chart
        if (!Number.isNaN(target) && Math.abs(px - target) > eps) prevDistinct = target
        target = px
        if (Number.isNaN(head)) head = px
        // raw points in 125 ms buckets (local arrival time); the newest point is the animated head
        const now = clock()
        const last = trail[trail.length - 1]
        if (last && Math.floor(last.t / BUCKET_MS) === Math.floor(now / BUCKET_MS)) {
          last.t = now
          last.p = px
        } else trail.push({ t: now, p: px })
      })

    }

    // ---- sizing
    const resize = () => {
      const r = box.getBoundingClientRect()
      const dpr = Math.min(2, window.devicePixelRatio || 1)
      w = Math.max(1, Math.round(r.width))
      h = Math.max(1, Math.round(r.height))
      cv.width = Math.round(w * dpr)
      cv.height = Math.round(h * dpr)
      cv.style.width = w + 'px'
      cv.style.height = h + 'px'
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()
    // A resize may bring a collapsed (hidden layout variant) chart back: restart the paused loop.
    const ro = new ResizeObserver(() => { resize(); kick() })
    ro.observe(box)
    // Off-screen charts (scrolled away) stop drawing until they intersect the viewport again.
    let onScreen = true
    const io = typeof IntersectionObserver === 'function' ? new IntersectionObserver((entries) => { onScreen = entries.some(e => e.isIntersecting); kick() }) : null
    io?.observe(box)

    const zoom = (next: number, ax: number, at = view.from + ax / view.pxPerMs) => {
      const now = clock()
      viewSpan = Math.min(Math.max(next, MIN_SPAN_MS), KEEP_MS, Math.max(spanMs, now - (trail[0]?.t ?? now)))
      if (pinned !== null) pinned = at - (ax * viewSpan) / ((w - TICK_GUTTER) * ANCHOR)
    }
    const pinchStart = () => {
      const [a, b] = [...touches.values()]
      pinch.d = Math.max(1, Math.abs(a - b))
      pinch.span = viewSpan
      pinch.at = view.from + (a + b) / 2 / view.pxPerMs
    }
    // offsetX/Y are canvas-relative already: no layout read per move, and scrolling cannot leave a stale rect.
    const onMove = (e: PointerEvent) => {
      hover.x = e.offsetX
      hover.y = e.offsetY
      if (touches.has(e.pointerId)) touches.set(e.pointerId, e.offsetX)
      if (touches.size === 2) {
        const [a, b] = [...touches.values()]
        zoom((pinch.span * pinch.d) / Math.max(1, Math.abs(a - b)), (a + b) / 2, pinch.at)
      } else if (e.pointerId === drag.id) pinned = drag.from - (e.clientX - drag.x) / view.pxPerMs
    }
    const onLeave = () => {
      hover.x = hover.y = -1
    }
    const onDown = (e: PointerEvent) => {
      // view is unset until the first drawn frame
      if (e.button !== 0 || !view.from || e.offsetX > w - TICK_GUTTER || e.offsetY > h - AXIS_H) return
      if (e.pointerType === 'touch') {
        touches.set(e.pointerId, e.offsetX)
        if (touches.size > 2) return
        if (touches.size === 2) {
          drag.id = -1
          cv.classList.remove('is-panning')
          pinchStart()
        }
      }
      if (touches.size < 2) {
        drag.id = e.pointerId
        drag.x = e.clientX
        drag.from = view.from
        cv.classList.add('is-panning')
      }
      cv.setPointerCapture(e.pointerId)
    }
    const onUp = (e: PointerEvent) => {
      if (touches.delete(e.pointerId) && touches.size === 2) pinchStart()
      if (e.pointerId !== drag.id) return
      drag.id = -1
      cv.classList.remove('is-panning')
    }
    const onReset = () => {
      viewSpan = spanMs
      pinned = null
    }
    // A trackpad pinch arrives as ctrl+wheel
    const onWheel = (e: WheelEvent) => {
      if (!view.from) return
      const k = e.deltaMode === 1 ? 16 : 1
      const dx = e.shiftKey && !e.deltaX ? e.deltaY : Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : 0
      if (dx) pinned = view.from + (dx * k) / view.pxPerMs
      else if (e.deltaY) zoom(viewSpan * Math.exp(e.deltaY * k * (e.ctrlKey ? 0.01 : 0.002)), e.offsetX)
      else return
      e.preventDefault()
      kick()
    }
    goLive.current = () => { pinned = null }
    cv.addEventListener('pointermove', onMove)
    cv.addEventListener('pointerleave', onLeave)
    cv.addEventListener('pointerdown', onDown)
    cv.addEventListener('pointerup', onUp)
    cv.addEventListener('pointercancel', onUp)
    cv.addEventListener('wheel', onWheel, { passive: false })
    cv.addEventListener('dblclick', onReset)

    // ---- drawing helpers
    const badge = (yy: number, text: string, bg: string, fg: string = C.ink, label?: string) => {
      const cw = w - TICK_GUTTER
      const top = Math.round(yy - LABEL_H / 2)
      ctx.font = FONT
      ctx.textBaseline = 'middle'
      ctx.fillStyle = bg
      ctx.beginPath()
      ctx.roundRect(cw, top, TICK_GUTTER, LABEL_H, [0, 2, 2, 0])
      ctx.fill()
      ctx.fillStyle = fg
      ctx.textAlign = 'left'
      ctx.fillText(text, cw + 6, top + LABEL_H / 2 + 0.5)
      if (label) {
        const lw = ctx.measureText(label).width + 10
        ctx.fillStyle = bg
        ctx.beginPath()
        ctx.roundRect(cw - lw, top, lw, LABEL_H, [2, 0, 0, 2])
        ctx.fill()
        ctx.fillStyle = fg
        ctx.textAlign = 'center'
        ctx.fillText(label, cw - lw / 2, top + LABEL_H / 2 + 0.5)
      }
    }

    const frame = (ts: number) => {
      raf = 0
      if (!alive) return
      if (document.hidden || !onScreen) {
        lastTs = 0
        return
      }
      if (lowFps && lastTs && ts - lastTs < LOW_FPS_MS) {
        raf = requestAnimationFrame(frame)
        return
      }
      const dt = lastTs ? Math.min(250, ts - lastTs) : 16.7
      lastTs = ts
      const now = clock()
      const cw = w - TICK_GUTTER
      const ch = h - AXIS_H

      ctx.clearRect(0, 0, w, h)
      // Collapsed (display:none variant): nothing to draw; the ResizeObserver restarts the loop.
      if (cw < 20 || ch < 20) {
        lastTs = 0
        return
      }
      if (Number.isNaN(head)) {
        raf = requestAnimationFrame(frame)
        return
      }

      // Streamed prices stay at their observation coordinates; only a held head is provisional.
      if (streamed) head = target
      else head += (target - head) * (1 - Math.exp(-dt / EASE_MS))
      if (Math.abs(target - head) < eps) head = target
      if (streamed) {
        const live = !!displaySource && streamFreshness(displaySource, now, priceStreamMarket(coin)!.staleAfterMs) === 'live'
        trail = displayTrail.advance(now, live)
        headT = displayTrail.headTime
      } else {
        const lastPt = trail[trail.length - 1]
        const prevPt = trail[trail.length - 2]
        if (lastPt) {
          if (Number.isNaN(headT) || lastPt.t - headT > 1000) headT = lastPt.t
          headT += (lastPt.t - headT) * (1 - Math.exp(-dt / EASE_MS))
          if (prevPt && headT < prevPt.t) headT = prevPt.t
          // quiet book (no BBO update for >1 s): carry the line forward so the head stays at "now"
          if (now - lastPt.t > 1000) trail.push({ t: now - 500, p: lastPt.p })
        }
      }
      if (!streamed && trail[0] && trail[0].t < now - KEEP_MS - 5000) {
        const cut = now - KEEP_MS
        let i = 0
        while (i < trail.length - 1 && trail[i].t < cut) i++
        if (i) trail = trail.slice(i)
      }

      // visible window
      const liveFrom = now - viewSpan
      if (pinned !== null) {
        pinned = Math.max(pinned, Math.min(trail[0]?.t ?? liveFrom, liveFrom))
        if (pinned >= liveFrom) pinned = null
      }
      const from = pinned ?? liveFrom
      const pxPerMs = (cw * ANCHOR) / viewSpan
      const tEnd = from + cw / pxPerMs
      view.from = from
      view.pxPerMs = pxPerMs
      const X = (t: number) => (t - from) * pxPerMs
      // trail is time-ordered
      const at = (t: number) => {
        let a = 0
        let b = trail.length
        while (a < b) {
          const m = (a + b) >> 1
          if (trail[m].t < t) a = m + 1
          else b = m
        }
        return a
      }
      const i0 = Math.max(0, at(from - 1000) - 1)
      const i1 = at(tEnd + 1000)
      const toHead = i1 >= trail.length - 1
      let lo = toHead ? head : Infinity
      let hi = toHead ? head : -Infinity
      for (let i = i0; i <= i1 && i < trail.length; i++) {
        const p = trail[i].p
        if (p < lo) lo = p
        if (p > hi) hi = p
      }
      if (lo > hi) lo = hi = head

      // price auto-fit (gliding)
      const mid = (lo + hi) / 2
      const span = Math.max(hi - lo, mid * 1e-4, 10 ** -dp * 20)
      const half = span * 0.8
      const tlo = mid - half
      const thi = mid + half
      if (!y.init) {
        y.lo = y.tlo = tlo
        y.hi = y.thi = thi
        y.init = true
      } else {
        const tc = (y.tlo + y.thi) / 2
        const ts2 = y.thi - y.tlo
        if (Math.abs(mid - tc) > ts2 * 0.01 || Math.abs(2 * half - ts2) > ts2 * 0.03 || lo < y.tlo || hi > y.thi) {
          y.tlo = tlo
          y.thi = thi
        }
        const diff = Math.max(Math.abs(y.tlo - y.lo), Math.abs(y.thi - y.hi)) / (y.hi - y.lo || 1)
        const r = diff > 0.3 ? 0.35 : diff > 0.1 ? 0.16 : 0.06
        const k = 1 - (1 - r) ** (dt / 16.67)
        y.lo += (y.tlo - y.lo) * k
        y.hi += (y.thi - y.hi) * k
      }
      const Y = (p: number) => ((y.hi - p) / (y.hi - y.lo)) * ch

      // grid + price labels
      const step = niceStep(y.hi - y.lo, Math.max(2, Math.min(8, Math.floor(ch / 48))))
      ctx.font = FONT
      ctx.textBaseline = 'middle'
      ctx.textAlign = 'left'
      ctx.setLineDash([3, 4])
      ctx.strokeStyle = C.grid
      ctx.lineWidth = 1
      ctx.beginPath()
      for (let v = Math.ceil(y.lo / step) * step; v <= y.hi; v += step) {
        const yy = Math.round(Y(v)) + 0.5
        ctx.moveTo(0, yy)
        ctx.lineTo(cw, yy)
      }
      ctx.stroke()
      ctx.setLineDash([])
      ctx.fillStyle = C.muted
      for (let v = Math.ceil(y.lo / step) * step; v <= y.hi; v += step) {
        const yy = Y(v)
        if (yy > 8 && yy < ch - 8) ctx.fillText(fmt(v), cw + 6, yy)
      }

      // time labels (scroll continuously)
      // Nice steps, the smallest one that keeps labels ≥72px apart so narrow phones never overlap.
      const tStep = [1000, 2000, 5000, 10_000, 15_000, 30_000, 60_000, 120_000, 300_000, 600_000, 900_000].find((st) => st * pxPerMs >= 72) ?? 1_800_000
      ctx.textAlign = 'center'
      ctx.textBaseline = 'alphabetic'
      ctx.fillStyle = C.muted
      for (let t = Math.floor(from / tStep) * tStep; t <= tEnd + tStep; t += tStep) {
        const xx = X(t)
        if (xx < 24 || xx > cw - 24) continue
        ctx.fillText(fmtTime(t, true), xx, ch + 17)
      }

      // axes
      ctx.strokeStyle = C.border
      ctx.beginPath()
      ctx.moveTo(cw + 0.5, 0)
      ctx.lineTo(cw + 0.5, h)
      ctx.moveTo(0, ch + 0.5)
      ctx.lineTo(cw, ch + 0.5)
      ctx.stroke()

      // Series keeps observed points; only the legacy head eases its price and time.
      ctx.save()
      ctx.beginPath()
      ctx.rect(0, 0, cw, ch)
      ctx.clip()
      const path = new Path2D()
      const nLast = trail.length - 1
      const xHead = nLast >= 0 && !Number.isNaN(headT) ? X(headT) : X(now)
      const yHead = Y(head)
      let first = true
      let x0 = 0
      const iEnd = toHead ? nLast : i1
      for (let i = i0; i < iEnd; i++) {
        const xx = X(trail[i].t)
        const yy = Y(trail[i].p)
        if (first) {
          path.moveTo(xx, yy)
          x0 = xx
          first = false
        } else path.lineTo(xx, yy)
      }
      const xEnd = toHead ? xHead : X(trail[iEnd].t)
      const yEnd = toHead ? yHead : Y(trail[iEnd].p)
      if (first) {
        path.moveTo(xEnd, yEnd)
        x0 = xEnd
      } else path.lineTo(xEnd, yEnd)
      const area = new Path2D(path)
      area.lineTo(xEnd, ch)
      area.lineTo(x0, ch)
      area.closePath()
      const g = ctx.createLinearGradient(0, 0, 0, ch)
      g.addColorStop(0, rgba(C.ink, 0.1))
      g.addColorStop(1, rgba(C.ink, 0.01))
      ctx.fillStyle = g
      ctx.fill(area)
      ctx.lineJoin = 'round'
      ctx.lineCap = 'round'
      // chalk stroke: wide soft dust + glowing core
      ctx.strokeStyle = rgba(C.ink, 0.08)
      ctx.lineWidth = 7
      ctx.stroke(path)
      ctx.save()
      ctx.shadowColor = rgba(C.ink, 0.55)
      ctx.shadowBlur = 8
      ctx.strokeStyle = C.ink
      ctx.lineWidth = 2
      ctx.stroke(path)
      ctx.restore()

      // head dot
      ctx.fillStyle = rgba(C.ink, 0.18)
      ctx.beginPath()
      ctx.arc(xHead, yHead, 6.5, 0, Math.PI * 2)
      ctx.fill()
      ctx.save()
      ctx.shadowColor = rgba(C.ink, 0.8)
      ctx.shadowBlur = 10
      ctx.fillStyle = C.ink
      ctx.beginPath()
      ctx.arc(xHead, yHead, 3, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()

      // current price dotted line
      const up = !(target < prevDistinct)
      const dirCol = up ? C.pos : C.neg
      ctx.strokeStyle = dirCol
      ctx.globalAlpha = 0.45
      ctx.setLineDash([2, 3])
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(0, Math.round(yHead) + 0.5)
      ctx.lineTo(cw, Math.round(yHead) + 0.5)
      ctx.stroke()
      ctx.setLineDash([])
      ctx.globalAlpha = 1

      // position markers + preview LIQ
      type Mk = { price: number; text: string; bg: string; label?: string }
      const marks: Mk[] = []
      for (const p of posRef.current) {
        if (p.coin !== coin) continue
        const col = p.isLong ? C.pos : C.neg
        if (p.entry !== null) marks.push({ price: p.entry, text: fmt(p.entry), bg: col, label: `${p.isLong ? 'L' : 'S'} ${p.leverage}×` })
        if (p.bust !== null) marks.push({ price: p.bust, text: fmt(p.bust), bg: C.liq, label: 'LIQ' })
      }
      const pv = chartPreview.get()
      const pulse = 0.3 + 0.2 * Math.sin(ts / 300)
      const lines: { yy: number; col: string; dash: number[]; alpha: number; width: number }[] = []
      for (const m of marks) {
        const yy = Y(m.price)
        if (yy < 0 || yy > ch) continue
        lines.push({ yy, col: m.bg === C.liq ? C.neg : m.bg, dash: m.label === 'LIQ' ? [6, 8] : [4, 6], alpha: 0.55, width: m.label === 'LIQ' ? 1.5 : 1 })
      }
      if (pv.coin === coin && pv.bust && Number.isFinite(pv.bust)) {
        const yy = Y(pv.bust)
        if (yy >= 0 && yy <= ch) {
          lines.push({ yy, col: C.neg, dash: [6, 8], alpha: pulse, width: 1.5 })
          marks.push({ price: pv.bust, text: fmt(pv.bust), bg: rgba(C.liq, 0.85), label: 'LIQ' })
        }
      }
      for (const l of lines) {
        ctx.globalAlpha = l.alpha
        ctx.strokeStyle = l.col
        ctx.lineWidth = l.width
        ctx.setLineDash(l.dash)
        ctx.beginPath()
        ctx.moveTo(0, Math.round(l.yy) + 0.5)
        ctx.lineTo(cw, Math.round(l.yy) + 0.5)
        ctx.stroke()
      }
      ctx.setLineDash([])
      ctx.globalAlpha = 1

      // your fills: B (buy) under the line, S (sell) above it
      ctx.font = "700 11px Lato, system-ui, sans-serif"
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      for (const f of fillsRef.current) {
        if (f.t < from || f.t > now) continue
        const fx = X(f.t)
        const fy = Y(f.p)
        if (fy < -8 || fy > ch + 8) continue
        const col = f.buy ? C.pos : C.neg
        const tagY = f.buy ? fy + 15 : fy - 33
        ctx.globalAlpha = 0.7
        ctx.fillStyle = col
        ctx.fillRect(fx - 1, f.buy ? fy + 4 : fy - 14, 2, 10)
        ctx.globalAlpha = 1
        ctx.beginPath()
        ctx.arc(fx, fy, 4, 0, Math.PI * 2)
        ctx.fillStyle = col
        ctx.fill()
        ctx.lineWidth = 2
        ctx.strokeStyle = C.panel
        ctx.stroke()
        ctx.beginPath()
        ctx.roundRect(fx - 11, tagY, 22, 18, 4)
        ctx.fill()
        ctx.fillStyle = f.buy ? C.posInk : C.negInk
        ctx.fillText(f.buy ? 'B' : 'S', fx, tagY + 9.5)
      }

      // crosshair
      const hx = hover.x
      const hy = hover.y
      const hovering = hx >= 0 && hx <= cw && hy >= 0 && hy <= ch
      if (hovering) {
        ctx.strokeStyle = rgba(C.ink, 0.3)
        ctx.setLineDash([3, 3])
        ctx.beginPath()
        ctx.moveTo(Math.round(hx) + 0.5, 0)
        ctx.lineTo(Math.round(hx) + 0.5, ch)
        ctx.moveTo(0, Math.round(hy) + 0.5)
        ctx.lineTo(cw, Math.round(hy) + 0.5)
        ctx.stroke()
        ctx.setLineDash([])
      }
      ctx.restore()

      // right-axis badges, stacked so they don't overlap
      const labels = [
        ...marks.filter((m) => {
          const yy = Y(m.price)
          return yy >= 0 && yy <= ch
        }).map((m) => ({ y: Y(m.price), ...m })),
        { y: yHead, text: fmt(target), bg: dirCol, price: target, label: undefined as string | undefined },
      ].sort((a, b) => a.y - b.y)
      let floor = 1
      for (const l of labels) {
        l.y = Math.max(l.y, floor + LABEL_H / 2)
        floor = l.y + LABEL_H / 2 + 1
      }
      let ceil = ch - 1
      for (let i = labels.length - 1; i >= 0; i--) {
        const l = labels[i]
        if (l.y + LABEL_H / 2 <= ceil) break
        l.y = ceil - LABEL_H / 2
        ceil = l.y - LABEL_H / 2 - 1
      }
      // dark ink on bright chalk badges (mint/pink), chalk-white on the deep LIQ badge
      for (const l of labels) badge(l.y, l.text, l.bg, l.bg === C.pos ? C.posInk : l.bg === C.neg ? C.negInk : C.ink, l.label)

      if (hovering) {
        const price = y.hi - (hy / ch) * (y.hi - y.lo)
        badge(hy, fmt(price), C.raised)
        const tt = from + hx / pxPerMs
        const txt = fmtTime(tt, true)
        ctx.font = FONT
        const tw = ctx.measureText(txt).width + 12
        ctx.fillStyle = C.raised
        ctx.fillRect(Math.max(0, Math.min(cw - tw, hx - tw / 2)), ch + 1, tw, LABEL_H + 2)
        ctx.fillStyle = C.ink
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(txt, Math.max(tw / 2, Math.min(cw - tw / 2, hx)), ch + 1 + (LABEL_H + 2) / 2)
        // fill tooltip
        let near: Fill | null = null, best = 14
        for (const f of fillsRef.current) {
          if (f.t < from || f.t > now) continue
          const d = Math.hypot(X(f.t) - hx, Y(f.p) - hy)
          if (d < best) { best = d; near = f }
        }
        if (near) {
          const head = near.buy ? 'Buy' : 'Sell'
          const body = near.tip.replace(/^(Buy|Sell) · /, '')
          ctx.font = TIP_BOLD
          const headW = ctx.measureText(head).width
          ctx.font = TIP_FONT
          const w = Math.max(headW + 24 + ctx.measureText(coin).width, ctx.measureText(body).width) + 20, th = 60
          const bx = Math.max(4, Math.min(cw - w - 4, hx + 12)), by = hy - th - 10 >= 4 ? hy - th - 10 : Math.min(ch - th - 4, hy + 14)
          ctx.save()
          ctx.shadowColor = 'rgba(0,0,0,.35)'; ctx.shadowBlur = 7; ctx.shadowOffsetY = 6
          ctx.fillStyle = C.raised
          ctx.beginPath(); ctx.roundRect(bx, by, w, th, 4); ctx.fill()
          ctx.restore()
          ctx.strokeStyle = TIP_LINE
          ctx.lineWidth = 1
          ctx.beginPath(); ctx.roundRect(bx + 0.5, by + 0.5, w - 1, th - 1, 4); ctx.stroke()
          ctx.textBaseline = 'middle'
          ctx.textAlign = 'left'
          ctx.font = TIP_BOLD
          ctx.fillStyle = near.buy ? C.pos : C.neg
          ctx.fillText(head, bx + 10, by + 18)
          ctx.font = TIP_FONT
          ctx.fillStyle = C.ink
          ctx.fillText(body, bx + 10, by + 42)
          ctx.textAlign = 'right'
          ctx.fillText(coin, bx + w - 10, by + 18)
        }
      }

      raf = requestAnimationFrame(frame)
    }

    let readyFlag = false
    const kick = () => {
      if (!raf && alive && !document.hidden && onScreen) raf = requestAnimationFrame(frame)
    }
    const readyPoll = setInterval(() => {
      if (!readyFlag && !Number.isNaN(head)) {
        readyFlag = true
        setReady(true)
        clearInterval(readyPoll)
      }
    }, 100)
    document.addEventListener('visibilitychange', kick)
    kick()

    return () => {
      alive = false
      if (raf) cancelAnimationFrame(raf)
      clearInterval(readyPoll)
      unTick()
      ro.disconnect()
      io?.disconnect()
      cv.removeEventListener('pointermove', onMove)
      cv.removeEventListener('pointerleave', onLeave)
      cv.removeEventListener('pointerdown', onDown)
      cv.removeEventListener('pointerup', onUp)
      cv.removeEventListener('pointercancel', onUp)
      cv.removeEventListener('wheel', onWheel)
      cv.removeEventListener('dblclick', onReset)
      goLive.current = () => {}
      document.removeEventListener('visibilitychange', kick)
    }
  }, [coin, dp, retry, spanMs])

  useEffect(() => {
    if (liveKey) goLive.current()
  }, [liveKey])

  return (
    <>
      <div className="chart-host tr-chart-host" ref={host}>
        <canvas ref={canvas} className="tr-tick-canvas" aria-label={`${coin} live price chart`} />
      </div>
      {!ready && <div className="tr-chart-state" role="status"><span>{historyError ? `${coin} price history unavailable` : `Awaiting ${coin} prices`}</span>{historyError && <Button size="sm" onClick={() => setRetry(n => n + 1)}>Retry chart</Button>}</div>}
    </>
  )
}
