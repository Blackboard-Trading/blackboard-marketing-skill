import type { HTMLAttributes, ReactNode } from 'react'
import { Tooltip } from '../Tooltip'
import type { TextTone } from './tone'
import { rollIfNumber } from './AnimatedNumber'

export function Card({ title, action, variant = 'outline', padding = 'md', as: Tag = 'section', children, className, ...rest }: Omit<HTMLAttributes<HTMLElement>, 'title'> & {
  title?: ReactNode
  action?: ReactNode
  variant?: 'outline' | 'plain' | 'filled'
  padding?: 'none' | 'sm' | 'md'
  as?: 'section' | 'div' | 'article' | 'aside'
}) {
  return (
    <Tag {...rest} className={`ui-card ui-card--${variant} ui-card--pad-${padding}${className ? ' ' + className : ''}`}>
      {(title || action) && (
        <div className="ui-card-head">
          {title && <h2 className="ui-card-title">{title}</h2>}
          {action && <div className="ui-card-action">{action}</div>}
        </div>
      )}
      {children}
    </Tag>
  )
}

export function Stat({ label, value, sub, size = 'md', tone, tip, className }: {
  label: ReactNode
  value: ReactNode
  sub?: ReactNode
  size?: 'sm' | 'md' | 'lg'
  tone?: TextTone
  tip?: ReactNode
  className?: string
}) {
  return (
    <div className={`ui-stat ui-stat--${size}${className ? ' ' + className : ''}`}>
      <span className="ui-stat-label">{tip ? <Tooltip content={tip}>{label}</Tooltip> : label}</span>
      <span className={'ui-stat-value ui-num' + (tone ? ' ui-' + tone : '')}>{rollIfNumber(value)}</span>
      {sub && <span className="ui-stat-sub">{sub}</span>}
    </div>
  )
}

export function StatGroup({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={'ui-statgroup' + (className ? ' ' + className : '')}>{children}</div>
}

export function KeyValue({ label, value, tone, tip, strong = false, strongValue = false, size = 'sm', className }: {
  label: ReactNode
  value: ReactNode
  tone?: TextTone
  tip?: ReactNode
  strong?: boolean
  /** Bold 14px value beside the 13px label. */
  strongValue?: boolean
  /** `md`: 14px label and value. */
  size?: 'sm' | 'md'
  className?: string
}) {
  return (
    <div className={'ui-kv' + (size === 'md' ? ' ui-kv--md' : '') + (strong ? ' ui-kv--strong' : '') + (strongValue ? ' ui-kv--strong-value' : '') + (className ? ' ' + className : '')}>
      <span className="ui-kv-label">{tip ? <Tooltip content={tip}>{label}</Tooltip> : label}</span>
      <span className={'ui-kv-value ui-num' + (tone ? ' ui-' + tone : '')}>{rollIfNumber(value)}</span>
    </div>
  )
}
