import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

const GAP = 6
const EDGE = 8

/** Shared tooltip. The bubble renders in a body portal, so it never takes the trigger's font or gets clipped.
 *  The hidden copy serves `aria-describedby`. `interactive: false` lets the pointer pass through the bubble, so leaving
 *  the trigger always closes it; `focusable: false` keeps the trigger out of the tab order. */
export function Tooltip({ content, children, className = 'hint', interactive = true, focusable = true }: { content: ReactNode; children: ReactNode; className?: string; interactive?: boolean; focusable?: boolean }) {
  const id = useId()
  const anchor = useRef<HTMLSpanElement>(null)
  const bubble = useRef<HTMLSpanElement>(null)
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)
  const show = useCallback(() => { clearTimeout(timer.current); setOpen(true) }, [])
  // Delay so the pointer can cross onto the bubble.
  const hide = useCallback(() => { clearTimeout(timer.current); timer.current = setTimeout(() => setOpen(false), 80) }, [])

  // Below the trigger, above if it would overflow, clamped to the sides.
  const place = useCallback(() => {
    const a = anchor.current?.getBoundingClientRect(), b = bubble.current?.getBoundingClientRect()
    if (!a || !b) return
    const vw = document.documentElement.clientWidth, vh = window.innerHeight
    const left = Math.max(EDGE, Math.min(a.left, vw - b.width - EDGE))
    const above = a.top - GAP - b.height
    const top = a.bottom + GAP + b.height > vh - EDGE && above >= EDGE ? above : a.bottom + GAP
    setPos({ top, left })
  }, [])

  useLayoutEffect(() => {
    if (open) place()
    else setPos(null)
  }, [open, place])

  useEffect(() => {
    if (!open) return
    // Follow, not close, on scroll: keyboard focus scrolls the trigger into view.
    let frame = 0
    const follow = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(place) }
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    window.addEventListener('scroll', follow, true)
    window.addEventListener('resize', follow)
    window.addEventListener('keydown', key)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('scroll', follow, true)
      window.removeEventListener('resize', follow)
      window.removeEventListener('keydown', key)
    }
  }, [open, place])
  useEffect(() => () => clearTimeout(timer.current), [])

  return (
    <>
      <span ref={anchor} className={className} tabIndex={focusable ? 0 : undefined} aria-describedby={id} onMouseEnter={show} onMouseLeave={hide} onFocus={show} onBlur={() => setOpen(false)}>
        {children}
      </span>
      <span id={id} hidden>{content}</span>
      {open && createPortal(
        <span ref={bubble} className="bb-tooltip" aria-hidden style={{ ...(pos ?? { top: 0, left: 0, visibility: 'hidden' }), ...(interactive ? null : { pointerEvents: 'none' }) }} onMouseEnter={interactive ? show : undefined} onMouseLeave={interactive ? hide : undefined}>
          {content}
        </span>,
        document.body,
      )}
    </>
  )
}
