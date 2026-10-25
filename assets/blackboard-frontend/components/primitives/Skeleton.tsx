import type { CSSProperties } from 'react'

const len = (v: number | string | undefined) => (typeof v === 'number' ? v + 'px' : v)

export function Skeleton({ w = '7ch', h = '1em', radius, block = false, label = 'Loading', className }: {
  w?: number | string
  h?: number | string
  radius?: number | string
  block?: boolean
  label?: string
  className?: string
}) {
  const style: CSSProperties = { width: len(w), height: len(h), borderRadius: len(radius) }
  return <span className={'ui-skel' + (block ? ' ui-skel--block' : '') + (className ? ' ' + className : '')} style={style} role="img" aria-label={label} />
}
