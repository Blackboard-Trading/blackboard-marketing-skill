import type { HTMLAttributes, ReactNode } from 'react'
import type { Tone } from './tone'

export function Tag({ tone = 'neutral', variant = 'soft', size = 'sm', caps = false, icon, children, className, ...rest }: HTMLAttributes<HTMLSpanElement> & {
  tone?: Tone
  variant?: 'soft' | 'outline' | 'solid'
  size?: 'sm' | 'md' | 'lg'
  caps?: boolean
  icon?: ReactNode
}) {
  return (
    <span {...rest} className={`ui-tag ui-tag--${tone} ui-tag--${variant} ui-tag--${size}${caps ? ' ui-tag--caps' : ''}${className ? ' ' + className : ''}`}>
      {icon}{children}
    </span>
  )
}

export function StatusDot({ tone = 'up', pulse = false, label }: { tone?: Tone; pulse?: boolean; label?: string }) {
  return <span className={`ui-dot ui-dot--${tone}${pulse ? ' is-pulsing' : ''}`} role={label ? 'img' : undefined} aria-label={label} aria-hidden={label ? undefined : true} />
}
