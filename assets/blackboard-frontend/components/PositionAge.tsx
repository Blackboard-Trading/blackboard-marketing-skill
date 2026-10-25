import { DASH, fmtDuration } from '../lib/format'
import { useNow } from '../lib/hooks'
import type { Position } from '../lib/types'

/** Display-only elapsed clock since the open block time. */
export function PositionAge({ position }: { position: Position }) {
  const now = useNow(1000)
  const age = position.openedAt > 0 ? (now - position.openedAt) / 1000 : null
  return <span className="tr-age">{age === null ? DASH : fmtDuration(age)}</span>
}
