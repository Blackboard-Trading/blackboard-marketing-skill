import type { HTMLAttributes, ReactNode } from 'react'

export type FieldState = 'default' | 'warning' | 'error'

export const fieldMessageId = (inputId: string) => inputId + '-msg'

/** Error wins over warning, warning over hint. The live regions stay mounted so changes are announced. */
export function Field({ label, htmlFor, aside, hint, warning, error, children, className }: {
  label?: ReactNode
  htmlFor: string
  aside?: ReactNode
  hint?: ReactNode
  warning?: ReactNode
  error?: ReactNode
  children: ReactNode
  className?: string
}) {
  const msg = error || warning || hint
  const kind = error ? 'error' : warning ? 'warning' : 'hint'
  return (
    <div className={'ui-field' + (className ? ' ' + className : '')}>
      {(label || aside) && (
        <div className="ui-field-head">
          {label && <label htmlFor={htmlFor} className="ui-field-label">{label}</label>}
          {aside && <span className="ui-field-aside">{aside}</span>}
        </div>
      )}
      {children}
      <p id={fieldMessageId(htmlFor)} className={'ui-field-msg ui-field-msg--' + kind + (msg ? '' : ' is-empty')}>
        <span aria-live="polite">{error ? null : msg}</span>
        <span aria-live="assertive">{error}</span>
      </p>
    </div>
  )
}

export function InputShell({ state = 'default', disabled = false, leading, trailing, size = 'md', align = 'right', children, className, ...rest }: HTMLAttributes<HTMLDivElement> & {
  state?: FieldState
  align?: 'left' | 'right'
  disabled?: boolean
  leading?: ReactNode
  trailing?: ReactNode
  size?: 'sm' | 'md' | 'lg'
}) {
  return (
    <div {...rest} className={`ui-input ui-input--${size}${align === 'left' ? ' ui-input--left' : ''}${state !== 'default' ? ' ui-input--' + state : ''}${disabled ? ' is-disabled' : ''}${className ? ' ' + className : ''}`}>
      {leading && <span className="ui-input-leading">{leading}</span>}
      {children}
      {trailing && <span className="ui-input-trailing">{trailing}</span>}
    </div>
  )
}
