import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { closeModal } from '../../lib/toast'
import { BbIcon } from '../BbIcon'
import { DUR, reducedMotion } from './motion'

export type ModalPlacement = 'anchored' | 'center'

const FOCUSABLE = 'a[href], button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])'

/** Anchored: non-modal panel under the header (bottom sheet on mobile). Center: aria-modal over a light scrim with a focus trap.
 *  Both close on Escape or an outside click, except while a signature is pending. */
export function Modal({ title, children, narrow, onClose = closeModal, busy = false, focusDialog = false, placement = 'anchored', className }: {
  title: string
  children: ReactNode
  narrow?: boolean
  onClose?: () => void
  busy?: boolean
  focusDialog?: boolean
  placement?: ModalPlacement
  className?: string
}) {
  const dialog = useRef<HTMLDivElement>(null)
  const titleId = useId()
  const [top, setTop] = useState<number | null>(null)
  const [leaving, setLeaving] = useState(false)
  const busyRef = useRef(busy)
  busyRef.current = busy
  const center = placement === 'center'
  const closeRef = useRef(onClose)
  closeRef.current = onClose
  const leaveTimer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const requestClose = useCallback((animate = true) => {
    if (leaveTimer.current !== undefined) return
    if (!animate || reducedMotion()) { closeRef.current(); return }
    if (busyRef.current) return
    setLeaving(true)
    leaveTimer.current = setTimeout(() => {
      if (busyRef.current) { leaveTimer.current = undefined; setLeaving(false); return }
      closeRef.current()
      // A caller may keep the panel open (e.g. step back), so it must stay usable.
      leaveTimer.current = undefined
      setLeaving(false)
    }, DUR.base)
  }, [])
  useEffect(() => () => clearTimeout(leaveTimer.current), [])
  useLayoutEffect(() => {
    if (center) return
    const place = () => { const h = document.querySelector('.bb-header')?.getBoundingClientRect(); setTop(h ? Math.max(0, h.bottom) + 8 : 64) }
    place()
    window.addEventListener('resize', place)
    return () => window.removeEventListener('resize', place)
  }, [center])
  useEffect(() => {
    const node = dialog.current
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const frame = requestAnimationFrame(() => {
      const pick = (sel: string) => dialog.current?.querySelector<HTMLElement>(sel) ?? null
      // Focusing the field would raise the touch keyboard over the sheet, so the panel takes focus.
      const touch = matchMedia('(pointer: coarse)').matches
      const target = focusDialog || touch ? null : pick('input:not(:disabled)') ?? pick('button:not(:disabled):not(.bb-flow-x):not([tabindex="-1"]), a[href]')
      ;(target ?? dialog.current)?.focus()
    })
    const k = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !busyRef.current) { e.preventDefault(); requestClose(); return }
      if (center && e.key === 'Tab' && dialog.current) {
        const items = [...dialog.current.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((el) => el.offsetParent !== null)
        if (!items.length) { e.preventDefault(); dialog.current.focus(); return }
        const first = items[0], last = items[items.length - 1]
        if (e.shiftKey && (document.activeElement === first || document.activeElement === dialog.current)) { e.preventDefault(); last.focus() }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
      }
    }
    const down = (e: PointerEvent) => {
      const t = e.target as Node | null
      if (busyRef.current || !t || dialog.current?.contains(t)) return
      // Clicks on toasts or on whatever opened a flow should not close it.
      if ((t as Element).closest?.('.toaster, .bb-walletpill, .ly-wmenu, [aria-haspopup="dialog"]')) return
      // Close at once so the clicked element keeps the focus it is about to receive.
      requestClose(false)
    }
    document.addEventListener('keydown', k)
    document.addEventListener('pointerdown', down, true)
    document.body.classList.add('bb-flow-open')
    if (center) document.body.classList.add('ui-scroll-lock')
    return () => {
      cancelAnimationFrame(frame)
      document.removeEventListener('keydown', k)
      document.removeEventListener('pointerdown', down, true)
      document.body.classList.remove('bb-flow-open', 'ui-scroll-lock')
      const active = document.activeElement
      if (opener?.isConnected && (!active || active === document.body || node?.contains(active))) opener.focus()
    }
  }, [requestClose, focusDialog, center])
  const panel = (
    <div
      ref={dialog}
      className={'bb-pop bb-flow' + (center ? ' ui-modal--center' : '') + (narrow ? ' narrow' : '') + (leaving ? ' is-leaving' : '') + (className ? ' ' + className : '')}
      role="dialog"
      aria-modal={center}
      aria-labelledby={titleId}
      tabIndex={-1}
      style={!center && top !== null ? ({ '--flow-top': top + 'px' } as CSSProperties) : undefined}
    >
      <span className="grab" aria-hidden />
      <div className="bb-flow-h">
        <h2 id={titleId}>{title}</h2>
        <button type="button" className="bb-flow-x" onClick={() => requestClose()} disabled={busy} aria-label="Close" title={busy ? 'Finish or reject the request in your wallet first' : 'Close · Esc'}><BbIcon n="closecircle" s={18} /></button>
      </div>
      <div className="bb-flow-b">{children}</div>
    </div>
  )
  return center ? <div className={'ui-modal-overlay' + (leaving ? ' is-leaving' : '')}>{panel}</div> : panel
}
