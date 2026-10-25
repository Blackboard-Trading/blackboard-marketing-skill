import type { ReactNode, TdHTMLAttributes, ThHTMLAttributes } from 'react'
import { Skeleton } from './Skeleton'

export type SortDir = 'none' | 'asc' | 'desc'
export type CellAlign = 'left' | 'right'

/** Small arrow like papertrade: ↓ for desc, ↑ for asc; hidden until hover when the column is not sorted. */
export const SortIcon = ({ dir }: { dir: SortDir }) => <span className={'ui-sort ui-sort--' + dir} aria-hidden>{dir === 'asc' ? '↑' : '↓'}</span>

const ariaSort = { none: 'none', asc: 'ascending', desc: 'descending' } as const

export function TableHeaderCell({ children, align = 'left', sort, onSort, icon, className, ...rest }: Omit<ThHTMLAttributes<HTMLTableCellElement>, 'align'> & {
  align?: CellAlign
  sort?: SortDir
  onSort?: () => void
  icon?: ReactNode
}) {
  const cls = `ui-th${align === 'right' ? ' ui-th--right' : ''}${className ? ' ' + className : ''}`
  return (
    <th {...rest} scope={rest.scope ?? 'col'} className={cls} aria-sort={sort && onSort ? ariaSort[sort] : undefined}>
      {onSort ? (
        <button type="button" className="ui-th-sort" onClick={onSort}>
          {children}{icon}<SortIcon dir={sort ?? 'none'} />
        </button>
      ) : <span className="ui-th-label">{children}{icon}</span>}
    </th>
  )
}

export type CellKind = 'text' | 'textSub' | 'leadingIcon' | 'trailingIcon' | 'action' | 'loading' | 'input'

export function TableCell({ kind = 'text', align = 'left', icon, sub, children, className, ...rest }: Omit<TdHTMLAttributes<HTMLTableCellElement>, 'align'> & {
  kind?: CellKind
  align?: CellAlign
  icon?: ReactNode
  sub?: ReactNode
}) {
  const cls = `ui-td ui-td--${kind}${align === 'right' ? ' ui-td--right' : ''}${className ? ' ' + className : ''}`
  let body: ReactNode
  switch (kind) {
    case 'textSub': body = <span className="ui-td-stack"><span className="ui-td-value">{children}</span><span className="ui-td-sub">{sub}</span></span>; break
    case 'leadingIcon': body = <span className="ui-td-row">{icon}<span className="ui-td-value">{children}</span></span>; break
    case 'trailingIcon': body = <span className="ui-td-row"><span className="ui-td-value">{children}</span>{icon}</span>; break
    case 'action': body = <span className="ui-td-row ui-td-actions">{children}</span>; break
    case 'loading': body = <Skeleton w={96} h={12} />; break
    default: body = children
  }
  return <td {...rest} className={cls} aria-busy={kind === 'loading' || undefined}>{body}</td>
}
