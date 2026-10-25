import type { ReactNode } from 'react'
import { DASH } from '../../lib/format'
import { BbIcon, type BbIconName } from '../BbIcon'
import { Skeleton } from './Skeleton'
import { rollIfNumber } from './AnimatedNumber'
import { ChalkEmpty } from '../ChalkEmpty'

/** A value that cannot be shown right now. Never a zero and never a skeleton. */
export const Unavailable = ({ title = 'Unavailable' }: { title?: string }) => <span className="ui-unavail" role="img" title={title} aria-label={title}>{DASH}</span>

/** A value the backend does not provide yet. `field` names what is missing; every use must be gone before release. */
export function Todo({ field, block = false }: { field: string; block?: boolean }) {
  const tag = <span className="ui-todo" title={'TODO: ' + field} data-todo={field}>TODO</span>
  return block ? <div className="ui-todo-block">{tag}<code>{field}</code></div> : tag
}

/** A value that may still load or be missing: skeleton during the first read, `fallback` when there is nothing to show. */
export function Value<T>({ data, loading, w = 64, h = 12, fallback = <Unavailable />, children }: {
  data: T | null | undefined
  loading: boolean
  w?: number | string
  h?: number | string
  fallback?: ReactNode
  children: (d: T) => ReactNode
}) {
  // a formatted figure rolls (on first show and on every change)
  if (data != null) return rollIfNumber(children(data))
  return loading ? <Skeleton w={w} h={h} /> : fallback
}

export function EmptyState({ title, children, action, icon = 'info', size = 'md', className }: {
  title?: ReactNode
  children?: ReactNode
  action?: ReactNode
  icon?: BbIconName | null
  size?: 'sm' | 'md'
  className?: string
}) {
  return (
    <div className={`ui-state ui-state--empty ui-state--${size}${className ? ' ' + className : ''}`}>
      <ChalkEmpty icon={icon} size={size} />
      {/* One line of text; the action reads as a coloured text link at its end. */}
      <p className="ui-state-line">
        {title && <b className="ui-state-title">{title}</b>}
        {children && <span className="ui-state-body">{children}</span>}
        {action && <span className="ui-state-action">{action}</span>}
      </p>
    </div>
  )
}

export type NoticeTone = 'stale' | 'warn' | 'error'
const NOTICE_ICON: Record<NoticeTone, BbIconName> = { stale: 'stale', warn: 'warning', error: 'warning' }

/** Inline notice: `stale` data, a `warn`ing state (paused, short custody) or an `error`. Errors are announced at once. */
export function Notice({ tone = 'stale', icon, role, children, action, className }: {
  tone?: NoticeTone
  icon?: BbIconName
  role?: 'status' | 'alert'
  children: ReactNode
  action?: ReactNode
  className?: string
}) {
  return (
    <div className={`ui-notice ui-notice--${tone}${className ? ' ' + className : ''}`} role={role ?? (tone === 'error' ? 'alert' : 'status')}>
      <BbIcon n={icon ?? NOTICE_ICON[tone]} s={16} className="ui-notice-icon" />
      <span className="ui-notice-body">{children}</span>
      {action}
    </div>
  )
}

export const StaleNotice = ({ children, action, className }: { children: ReactNode; action?: ReactNode; className?: string }) => <Notice action={action} className={className}>{children}</Notice>
