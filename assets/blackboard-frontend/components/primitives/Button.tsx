import type { ButtonHTMLAttributes, ReactNode, Ref } from 'react'
import { Link, type LinkProps } from 'react-router-dom'

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'tertiary' | 'chalk' | 'long' | 'short' | 'danger'
export type ButtonSize = 'sm' | 'md' | 'lg'

export function buttonClass({ variant = 'secondary', size = 'md', block = false, flat = false, className }: { variant?: ButtonVariant; size?: ButtonSize; block?: boolean; flat?: boolean; className?: string } = {}) {
  return `ui-btn ui-btn--${variant} ui-btn--${size}${block ? ' ui-btn--block' : ''}${flat ? ' ui-btn--flat' : ''}${className ? ' ' + className : ''}`
}

/** Hover sparkles are decoration only. */
const ButtonDecor = () => <span className="ui-btn-spark" aria-hidden />

type ButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> & {
  ref?: Ref<HTMLButtonElement>
  variant?: ButtonVariant
  size?: ButtonSize
  block?: boolean
  /** 40px, radius 4, no chalk texture: the trade ticket submit. */
  flat?: boolean
  loading?: boolean
  icon?: ReactNode
  iconRight?: ReactNode
  children?: ReactNode
}

export function Button({ variant = 'secondary', size = 'md', block, flat, loading = false, icon, iconRight, children, className, disabled, type = 'button', ...rest }: ButtonProps) {
  return (
    <button
      {...rest}
      type={type}
      className={buttonClass({ variant, size, block, flat, className }) + (loading ? ' is-loading' : '')}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
    >
      <ButtonDecor />
      {/* Busy: the spinner sits before the unchanged label, so the button still says what it is doing. */}
      <span className="ui-btn-label">{loading ? <span className="ui-spinner" aria-hidden /> : icon}{children}{iconRight}</span>
    </button>
  )
}

/** A router link drawn as a Button. */
export function ButtonLink({ variant = 'secondary', size = 'md', block, className, children, ...rest }: Omit<LinkProps, 'className'> & {
  variant?: ButtonVariant
  size?: ButtonSize
  block?: boolean
  className?: string
}) {
  return (
    <Link {...rest} className={buttonClass({ variant, size, block, className })}>
      <ButtonDecor />
      <span className="ui-btn-label">{children}</span>
    </Link>
  )
}

export type IconButtonVariant = 'ghost' | 'chalk' | 'outline'

type IconButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children' | 'aria-label'> & {
  label: string
  icon: ReactNode
  variant?: IconButtonVariant
  size?: ButtonSize
}

export function IconButton({ label, icon, variant = 'ghost', size = 'md', className, type = 'button', title, ...rest }: IconButtonProps) {
  return (
    <button {...rest} type={type} aria-label={label} title={title ?? label} className={`ui-iconbtn ui-iconbtn--${variant} ui-iconbtn--${size}${className ? ' ' + className : ''}`}>
      {variant === 'chalk' && <ButtonDecor />}
      {icon}
    </button>
  )
}
