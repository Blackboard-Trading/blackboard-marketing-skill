import { useId, useState, type ReactNode } from 'react'
import { BbIcon } from '../BbIcon'

/** Height animates through grid rows (no measuring); closed content is inert so it leaves the tab order. */
export function Collapse({ open, children, id, className }: { open: boolean; children: ReactNode; id?: string; className?: string }) {
  return (
    <div id={id} className={'ui-collapse' + (open ? ' is-open' : '') + (className ? ' ' + className : '')} inert={!open}>
      <div className="ui-collapse-inner">{children}</div>
    </div>
  )
}

export function Disclosure({ summary, trailing, children, open: controlled, defaultOpen = false, onOpenChange, className }: {
  summary: ReactNode
  trailing?: ReactNode
  children: ReactNode
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
  className?: string
}) {
  const [own, setOwn] = useState(defaultOpen)
  const open = controlled ?? own
  const id = useId()
  const toggle = () => { const next = !open; if (controlled === undefined) setOwn(next); onOpenChange?.(next) }
  return (
    <div className={'ui-disclosure' + (open ? ' is-open' : '') + (className ? ' ' + className : '')}>
      <button type="button" className="ui-disclosure-summary" aria-expanded={open} aria-controls={id} onClick={toggle}>
        <span className="ui-disclosure-label">{summary}</span>
        {trailing !== undefined && <span className="ui-disclosure-trailing">{trailing}</span>}
        <BbIcon n="chev" s={14} className="ui-caret" />
      </button>
      <Collapse open={open} id={id}>{children}</Collapse>
    </div>
  )
}
