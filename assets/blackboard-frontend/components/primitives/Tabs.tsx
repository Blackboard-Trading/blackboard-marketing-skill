import type { ButtonHTMLAttributes, KeyboardEvent, ReactNode } from 'react'
import { TabCount } from '../ui'
import type { Tone } from './tone'

export interface TabItem<T extends string> {
  value: T
  label: ReactNode
  icon?: ReactNode
  count?: number
  countLoading?: boolean
  disabled?: boolean
}

export const tabId = (base: string, value: string) => `${base}-tab-${value}`
export const tabPanelProps = (base: string, value: string) => ({ id: `${base}-panel-${value}`, role: 'tabpanel' as const, 'aria-labelledby': tabId(base, value) })

/** Arrow keys move between enabled options and select them (roving tabindex). */
export function roving<T extends string>(e: KeyboardEvent, items: { value: T; disabled?: boolean }[], value: T, onChange: (v: T) => void) {
  const keys = ['ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp', 'Home', 'End']
  if (!keys.includes(e.key)) return
  const enabled = items.filter((i) => !i.disabled)
  if (!enabled.length) return
  e.preventDefault()
  const i = Math.max(0, enabled.findIndex((x) => x.value === value))
  const next = e.key === 'Home' ? 0 : e.key === 'End' ? enabled.length - 1 : (i + (e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : -1) + enabled.length) % enabled.length
  const target = enabled[next]
  onChange(target.value)
  const group = e.currentTarget as HTMLElement
  group.querySelectorAll<HTMLElement>('[role="tab"], [role="radio"]')[items.indexOf(target)]?.focus()
}

export function Tabs<T extends string>({ items, value, onChange, idBase, variant = 'text', size = 'md', orientation = 'horizontal', label, className, trailing }: {
  items: TabItem<T>[]
  value: T
  onChange: (v: T) => void
  idBase?: string
  variant?: 'text' | 'underline' | 'box'
  size?: 'sm' | 'md'
  orientation?: 'horizontal' | 'vertical'
  label: string
  className?: string
  trailing?: ReactNode
}) {
  return (
    <div className={`ui-tabs ui-tabs--${variant} ui-tabs--${size}${orientation === 'vertical' ? ' ui-tabs--vertical' : ''}${className ? ' ' + className : ''}`}>
      <div className="ui-tabs-list" role="tablist" aria-label={label} aria-orientation={orientation} onKeyDown={(e) => roving(e, items, value, onChange)}>
        {items.map((it) => {
          const on = it.value === value
          return (
            <button
              key={it.value}
              type="button"
              role="tab"
              id={idBase ? tabId(idBase, it.value) : undefined}
              aria-controls={idBase ? `${idBase}-panel-${it.value}` : undefined}
              aria-selected={on}
              tabIndex={on ? 0 : -1}
              disabled={it.disabled}
              className={'ui-tab' + (on ? ' is-active' : '')}
              onClick={() => onChange(it.value)}
            >
              {it.icon}{it.label}
              {(it.count !== undefined || it.countLoading) && <TabCount n={it.countLoading ? undefined : it.count} />}
            </button>
          )
        })}
      </div>
      {trailing && <div className="ui-tabs-trailing">{trailing}</div>}
    </div>
  )
}

export interface SegmentOption<T extends string> {
  value: T
  label: ReactNode
  icon?: ReactNode
  tone?: Extract<Tone, 'up' | 'down'>
  disabled?: boolean
}

export function Segmented<T extends string>({ options, value, onChange, label, size = 'md', display = false, block = false, className }: {
  options: SegmentOption<T>[]
  value: T
  onChange: (v: T) => void
  label: string
  size?: 'sm' | 'md' | 'lg'
  display?: boolean
  block?: boolean
  className?: string
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={`ui-seg ui-seg--${size}${display ? ' ui-seg--display' : ''}${block ? ' ui-seg--block' : ''}${className ? ' ' + className : ''}`}
      onKeyDown={(e) => roving(e, options, value, onChange)}
    >
      {options.map((o) => {
        const on = o.value === value
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={on}
            tabIndex={on ? 0 : -1}
            disabled={o.disabled}
            className={'ui-seg-opt' + (on ? ' is-active' : '') + (o.tone ? ' ui-seg-opt--' + o.tone : '')}
            onClick={() => onChange(o.value)}
          >
            {o.icon}{o.label}
          </button>
        )
      })}
    </div>
  )
}

/** `selected` makes it a toggle (aria-pressed); leave it out for one-shot actions such as "Max". */
export function Chip({ selected, className, children, type = 'button', ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { selected?: boolean }) {
  return (
    <button {...rest} type={type} aria-pressed={rest['aria-pressed'] ?? selected} className={'ui-chip' + (selected ? ' is-selected' : '') + (className ? ' ' + className : '')}>
      {children}
    </button>
  )
}
