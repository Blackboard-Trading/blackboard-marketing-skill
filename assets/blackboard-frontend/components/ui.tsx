import { CopyIcon } from './Icons'
import { useCopy } from './primitives/hooks'
import { BbIcon } from './BbIcon'
import { buttonClass } from './primitives/Button'
import { LoadingState, type LoadingShape } from './LoadingState'

/** Copy icon; a successful copy swaps it for a check and shows "Copied" beside it (no toast). */
export function CopyBtn({ text, label = 'Copy value' }: { text: string; label?: string }) {
  const { copied, copy } = useCopy(1600)
  return (
    <button type="button" className="copy-btn" data-copied={copied ? '' : undefined} title={copied ? 'Copied' : 'Copy'} aria-label={copied ? 'Copied' : label} onClick={() => copy(text)}>
      {copied ? <BbIcon n="check" s={13} /> : <CopyIcon />}
    </button>
  )
}

/** Read failures stay distinct from an empty account, empty pool or zero balance. */
export function DataNotice({ error, loading, label = 'data', onRetry, shape }: { error?: string; loading?: boolean; label?: string; onRetry?: () => void; shape?: LoadingShape }) {
  if (!error && !loading) return null
  if (!error) return <LoadingState label={`Loading ${label}…`} shape={shape} />
  return <div className="data-notice error" role="alert">
    <span className="data-notice-icon" aria-hidden>!</span>
    <div><b>{`Unable to load ${label}`}</b><small>Live data is unavailable. Values are not assumed to be zero.</small></div>
    {onRetry && <button className={buttonClass({ size: 'sm' })} type="button" onClick={onRetry}>Retry</button>}
  </div>
}

/** Tab count. `undefined` holds the slot while loading so tabs never shift; 0 recedes; 999+ caps. */
export function TabCount({ n, tone }: { n: number | undefined; tone?: 'warn' }) {
  // The leading space keeps the tab's accessible name "Trades 12", not "Trades12".
  if (n === undefined) return <>{' '}<span className="bb-tabcount load" aria-hidden /></>
  return <>{' '}<span className={'bb-tabcount' + (n === 0 ? ' zero' : tone ? ' ' + tone : '')}>{n > 999 ? '999+' : n}</span></>
}

