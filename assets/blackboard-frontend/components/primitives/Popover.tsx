import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type ReactNode } from 'react'
import { BbIcon } from '../BbIcon'
import { Caret } from '../Icons'
import { DUR, usePresence } from './motion'

export type PopoverAlign = 'start' | 'end'

/** Floating surface under its `.ui-popover-anchor` parent. Closes on outside click and Escape; animates in and out. */
export function Popover({ open, onClose, align = 'start', className, children, id, role, label }: {
  open: boolean
  onClose: () => void
  align?: PopoverAlign
  className?: string
  children: ReactNode
  id?: string
  role?: 'menu' | 'dialog' | 'listbox'
  label?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const presence = usePresence(open, DUR.fast)
  useEffect(() => {
    if (!open) return
    const anchor = () => ref.current?.parentElement ?? null
    const down = (e: PointerEvent) => { if (!anchor()?.contains(e.target as Node)) onClose() }
    const k = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      // Capture phase: the Escape closes this popover only, not a Modal around it.
      e.preventDefault()
      e.stopPropagation()
      anchor()?.querySelector<HTMLElement>('[aria-expanded]')?.focus()
      onClose()
    }
    document.addEventListener('pointerdown', down)
    document.addEventListener('keydown', k, true)
    return () => { document.removeEventListener('pointerdown', down); document.removeEventListener('keydown', k, true) }
  }, [open, onClose])
  const [side, setSide] = useState(align)
  const [up, setUp] = useState(false)
  useLayoutEffect(() => {
    if (presence === null) { setSide(align); setUp(false); return }
    if (presence !== 'enter') return
    const r = ref.current?.getBoundingClientRect(), a = ref.current?.parentElement?.getBoundingClientRect()
    if (!r || !a) return
    const vw = document.documentElement.clientWidth, vh = document.documentElement.clientHeight
    if (align === 'end' && r.left < 8) setSide('start')
    else if (align === 'start' && r.right > vw - 8) setSide('end')
    // Opening past the bottom would stretch the page under it (a pager at the foot of a table); open upward when it fits.
    if (r.bottom > vh - 8 && a.top - r.height - 4 >= 8) setUp(true)
  }, [presence, align])
  if (!presence) return null
  return (
    <div
      ref={ref}
      id={id}
      role={role}
      aria-label={label}
      className={`bb-pop ui-popover ui-popover--${side}${up ? ' ui-popover--up' : ''} ${presence === 'exit' ? 'ui-anim-pop-out' : 'ui-anim-pop-in'}${className ? ' ' + className : ''}`}
    >
      {children}
    </div>
  )
}

export interface MenuItem {
  key: string
  label: ReactNode
  icon?: ReactNode
  onSelect?: () => void
  href?: string
  disabled?: boolean
  tone?: 'danger'
  hint?: ReactNode
  /** Marks the current choice in a pick-one menu (menuitemradio). */
  selected?: boolean
}

export function Menu({ trigger, items, header, align = 'end', className, triggerClassName, label }: {
  trigger: ReactNode
  items: MenuItem[]
  header?: ReactNode
  align?: PopoverAlign
  className?: string
  triggerClassName?: string
  label: string
}) {
  const [open, setOpen] = useState(false)
  const id = useId()
  const root = useRef<HTMLDivElement>(null)
  const close = useCallback(() => setOpen(false), [])
  const focusItem = (dir: 1 | -1 | 'first' | 'last') => {
    const list = [...(root.current?.querySelectorAll<HTMLElement>('[role^="menuitem"]:not([aria-disabled="true"])') ?? [])]
    if (!list.length) return
    const i = list.indexOf(document.activeElement as HTMLElement)
    const next = dir === 'first' ? 0 : dir === 'last' ? list.length - 1 : (i + dir + list.length) % list.length
    list[next].focus()
  }
  useEffect(() => {
    if (!open) return
    const frame = requestAnimationFrame(() => {
      const checked = root.current?.querySelector<HTMLElement>('[aria-checked="true"]:not([aria-disabled="true"])')
      if (checked) checked.focus()
      else focusItem('first')
    })
    return () => cancelAnimationFrame(frame)
  }, [open])
  const onKey = (e: ReactKeyboardEvent) => {
    if (!open) return
    if (e.key === 'ArrowDown') { e.preventDefault(); focusItem(1) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); focusItem(-1) }
    else if (e.key === 'Home') { e.preventDefault(); focusItem('first') }
    else if (e.key === 'End') { e.preventDefault(); focusItem('last') }
    else if (e.key === 'Tab') setOpen(false)
  }
  const pick = (it: MenuItem) => {
    if (it.disabled) return
    root.current?.querySelector<HTMLElement>('[aria-expanded]')?.focus()
    setOpen(false)
    it.onSelect?.()
  }
  return (
    <div className={'ui-popover-anchor' + (className ? ' ' + className : '')} ref={root} onKeyDown={onKey}>
      <button type="button" className={triggerClassName ?? 'ui-menu-trigger'} aria-haspopup="menu" aria-expanded={open} aria-controls={open ? id : undefined} onClick={() => setOpen((o) => !o)}>
        {trigger}
        <Caret open={open} />
      </button>
      <Popover open={open} onClose={close} align={align} id={id} role="menu" label={label} className="ui-menu">
        {header && <div className="ui-menu-header" role="presentation">{header}</div>}
        {items.map((it) => {
          const radio = it.selected !== undefined
          const body = <><span className="ui-menu-label">{it.label}</span>{it.hint && <span className="ui-menu-hint">{it.hint}</span>}{it.icon ? <span className="ui-menu-icon">{it.icon}</span> : radio && <span className="ui-menu-check">{it.selected && <BbIcon n="check" s={16} />}</span>}</>
          const cls = 'ui-menu-item' + (it.tone === 'danger' ? ' is-danger' : '')
          const role = radio ? 'menuitemradio' : 'menuitem'
          return it.href
            ? <a key={it.key} role={role} aria-checked={radio ? it.selected : undefined} className={cls} href={it.href} target="_blank" rel="noreferrer" tabIndex={-1} aria-disabled={it.disabled || undefined} onClick={(e) => { if (it.disabled) e.preventDefault(); pick(it) }}>{body}</a>
            : <button key={it.key} type="button" role={role} aria-checked={radio ? it.selected : undefined} className={cls} tabIndex={-1} aria-disabled={it.disabled || undefined} onClick={() => pick(it)}>{body}</button>
        })}
      </Popover>
    </div>
  )
}
