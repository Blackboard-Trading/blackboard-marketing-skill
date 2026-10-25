import { memo, useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { refreshAccount } from '../../lib/account'
import { allOpenPositionIds, cancelPending, closePositions } from '../../lib/actions'
import { cfg, maxCloseIds, priceDecimals, sym } from '../../lib/config'
import { getHistory, tradesKey } from '../../lib/data'
import { DASH, fmtMinted, fmtPrice, fmtUsd, timeAgo } from '../../lib/format'
import { useApi, useClickOutside, useNow, useTrader } from '../../lib/hooks'
import { pendingPositionRows, pendingStore, type PendingEntry } from '../../lib/pending'
import { serverNow } from '../../lib/server-clock'
import { fromPosition, fromTrade, openShare } from '../../lib/share'
import { useStore } from '../../lib/store'
import { errMsg, openModal, toast } from '../../lib/toast'
import { fmtRoi, fmtSignedUsd, roiOf } from '../../lib/trade-math'
import type { Position, TradeRow } from '../../lib/types'
import { walletStore } from '../../lib/wallet'
import { CoinIcon, ShareIcon } from '../Icons'
import { Pagination, usePageSize } from '../Pagination'
import { PositionAge } from '../PositionAge'
import { PositionsPager } from '../PositionsPager'
import { Button, DataNotice, EmptyState, IconButton, TableCell, TableHeaderCell, PHONE, Tabs, Tag, Tooltip, tabPanelProps, toneClass, useMedia } from '../primitives'
import { StatusTab } from '../Status'
import { useLivePositions } from './live-positions'

/** Net est. PnL tone for Close all: win green, loss red, flat neutral. */
export const netTone = (v: number): 'pos' | 'neg' | 'zero' => (Math.abs(v) < 0.005 ? 'zero' : v > 0 ? 'pos' : 'neg')
const sideTxt = (isLong: boolean) => <span className={isLong ? 'ui-up' : 'ui-down'}>{isLong ? 'Long' : 'Short'}</span>
const AssetCell = ({ coin, lev, sub }: { coin: string; lev?: number; sub?: ReactNode }) => (
  <TableCell className="tr-asset"><CoinIcon coin={coin} size={16} /><b>{coin}{lev !== undefined && ` ${lev}×`}</b>{sub}</TableCell>
)

const ShareIconBtn = ({ onClick, label }: { onClick: () => void; label: string }) => <IconButton size="sm" className="tr-share" label={label} icon={<ShareIcon />} onClick={onClick} />

export const CardKV = ({ items }: { items: [string, ReactNode][] }) => <dl className={'tr-card-kv is-' + (items.length === 2 || items.length === 4 ? 2 : Math.min(items.length, 3))}>{items.map(([k, v]) => <div key={k}><dt>{k}</dt><dd className="ui-num">{v}</dd></div>)}</dl>
const retrying = (e: PendingEntry) => e.status === 'submitting' && !!e.error && !e.unconfirmed && e.settleUntil === undefined

/** `mobileCards`: one card per row instead of the horizontally scrolling table while `cardsMedia` matches. */
function PositionRows({ positions, share = false, closeLabel = 'Close', mobileCards = false, cardsMedia = PHONE }: { positions: Position[]; share?: boolean; closeLabel?: string; mobileCards?: boolean; cardsMedia?: string }) {
  const blocked = closeBlocked(useTrader())
  const { busy, close } = useClosePosition()
  const { entries } = useStore(pendingStore)
  const now = useNow(5000)
  const cards = useMedia(cardsMedia, mobileCards)
  const rows = pendingPositionRows(useLivePositions(positions, serverNow(now)), entries)
  if (cards) return (
    <ol className="tr-cards" role="list">{rows.map((row) => row.kind === 'open'
      ? <QueuedOpenCard key={row.key} entry={row.entry} closeLabel={closeLabel} />
      : <PositionCard key={row.key} p={row.position} closing={row.closing} share={share} closeLabel={closeLabel} blocked={blocked} busy={busy.has(row.position.id)} onClose={close} />)}</ol>
  )
  return (
    <div className="bb-scroll-x tr-table-wrap"><table className="ui-table tr-table tr-table--pos">
      <thead><tr><TableHeaderCell className="tr-col-asset">Asset</TableHeaderCell><TableHeaderCell className="tr-col-side">Side</TableHeaderCell><TableHeaderCell className="tr-col-size">Size</TableHeaderCell><TableHeaderCell>Entry</TableHeaderCell><TableHeaderCell className="tr-opt">Mark</TableHeaderCell><TableHeaderCell>Bust</TableHeaderCell><TableHeaderCell className="tr-col-pnl"><Tooltip content="ROI% = Open PnL / Margin * 100%">PnL (ROI%)</Tooltip></TableHeaderCell><TableHeaderCell className="tr-col-margin">Margin</TableHeaderCell><TableHeaderCell className="tr-opt tr-col-age">Age</TableHeaderCell><TableHeaderCell className="tr-col-act" align="right">Action</TableHeaderCell></tr></thead>
      <tbody>{rows.map((row) => row.kind === 'open'
        ? <QueuedOpenRow key={row.key} entry={row.entry} closeLabel={closeLabel} />
        : <PositionRow key={row.key} p={row.position} closing={row.closing} share={share} closeLabel={closeLabel} blocked={blocked} busy={busy.has(row.position.id)} onClose={close} />)}</tbody>
    </table></div>
  )
}

const DASH_CELL = '—'

/** Cancels a still-queued Open/Close (before the executor picks it up); hidden once it is being executed. */
export function CancelPendingBtn({ entry }: { entry: PendingEntry }) {
  const [busy, setBusy] = useState(false)
  if (entry.status !== 'queued' || entry.settleUntil !== undefined) return null
  return <Button variant="tertiary" size="sm" loading={busy} title="Cancel before it is executed" onClick={async () => { setBusy(true); try { await cancelPending(entry) } finally { setBusy(false) } }}>Cancel</Button>
}

/** Why Close is unavailable right now; empty when it is available. */
export const closeBlocked = ({ address, loaded, accountError }: { address: string | null; loaded: boolean; accountError: string | null }) =>
  !address ? 'Connect a wallet to close' : accountError ? 'Account failed to load' : !loaded ? 'Account is still loading' : ''

/** Positions being sent for close from this view; each locks only its own Close. */
export function useClosePosition() {
  const [busy, setBusy] = useState<ReadonlySet<string>>(() => new Set())
  const close = useCallback(async (id: string) => {
    setBusy((b) => new Set(b).add(id))
    try { await closePositions([id]) } finally { setBusy((b) => { const next = new Set(b); next.delete(id); return next }) }
  }, [])
  return { busy, close }
}

const CANCEL_AFTER_MS = 10_000
// The executor sends a batch every few seconds (3 s), so a normal close stays queued that long; Cancel shows only for one
// that is stuck well past a batch, so it never flashes up between Queued and Executed.
function LateCancel({ entry }: { entry: PendingEntry }) {
  const due = entry.createdAt + CANCEL_AFTER_MS
  const [late, setLate] = useState(() => Date.now() >= due)
  useEffect(() => {
    if (late) return
    const t = setTimeout(() => setLate(true), due - Date.now())
    return () => clearTimeout(t)
  }, [late, due])
  return late ? <CancelPendingBtn entry={entry} /> : null
}

/** Close keeps its place and label while its close is pending (disabled, with a spinner); Cancel sits to its left. */
export function ClosePositionBtn({ id, closing, label = 'Close', blocked, busy, onClose, variant = 'tertiary', className }: { id: string; closing?: PendingEntry; label?: string; blocked: string; busy: boolean; onClose: (id: string) => Promise<void>; variant?: 'secondary' | 'tertiary'; className?: string }) {
  const pending = busy || !!closing
  return <span className="tr-close-act">
    {closing && <LateCancel entry={closing} />}
    <Button variant={variant} size="sm" className={className} loading={pending} disabled={!!blocked || pending} title={pending ? 'Closing at the oracle price' : blocked || 'Close at the oracle price'} onClick={() => void onClose(id)}>{label}</Button>
  </span>
}

/** A pending Open holds the Close slot (disabled, with a spinner), so the cell changes once: when its position lands.
 *  Text shows only when the submit was lost and is being resent. */
export function PendingOpenAction({ entry, label = 'Close', variant = 'tertiary', className }: { entry: PendingEntry; label?: string; variant?: 'secondary' | 'tertiary'; className?: string }) {
  if (retrying(entry)) return <span className="bb-queue-action"><span className="bb-queue-label"><Tooltip content="Not received by the server yet. Retrying automatically.">Retrying…</Tooltip></span></span>
  return <span className="tr-close-act">
    <LateCancel entry={entry} />
    <Button variant={variant} size="sm" className={className} loading disabled title="Opening the position">{label}</Button>
  </span>
}

type RowProps = { p: Position; closing?: PendingEntry; share: boolean; closeLabel: string; blocked: string; busy: boolean; onClose: (id: string) => Promise<void> }

const QueuedOpenRow = memo(function QueuedOpenRow({ entry, closeLabel }: { entry: PendingEntry; closeLabel: string }) {
  const m = entry.meta ?? {}, dash = DASH_CELL
  return <tr className="bb-queue-row" data-tone={m.isLong === undefined ? undefined : m.isLong ? 'up' : 'down'}>
    <AssetCell coin={m.coin ?? entry.action} lev={m.leverage} /><TableCell>{m.isLong === undefined ? dash : sideTxt(m.isLong)}</TableCell>
    <TableCell>{m.size === undefined ? dash : fmtUsd(m.size)}</TableCell><TableCell>{dash}</TableCell><TableCell className="tr-opt">{dash}</TableCell><TableCell>{dash}</TableCell><TableCell>{dash}</TableCell>
    <TableCell>{m.margin === undefined ? dash : fmtUsd(m.margin)}</TableCell><TableCell className="tr-opt">{dash}</TableCell><TableCell kind="action" align="right"><PendingOpenAction entry={entry} label={closeLabel} /></TableCell>
  </tr>
})

/** One open position; re-renders only when its live valuation, closing state or the close controls change. */
const PositionRow = memo(function PositionRow({ p, closing, ...act }: RowProps) {
  const dash = DASH_CELL
  return <tr className={closing ? 'bb-queue-row' : undefined} data-tone={p.isLong ? 'up' : 'down'}>
    <AssetCell coin={p.coin} lev={p.leverage} /><TableCell>{sideTxt(p.isLong)}</TableCell>
    <TableCell>{fmtUsd(p.size)}</TableCell><TableCell>{fmtPrice(p.entry, priceDecimals(p.coin))}</TableCell><TableCell className="tr-opt">{fmtPrice(p.mark, priceDecimals(p.coin))}</TableCell><TableCell><span className="ui-warn">{fmtPrice(p.bust, priceDecimals(p.coin))}</span></TableCell>
    <TableCell>{p.pnl === null ? dash : <span className={toneClass(p.pnl)}>{fmtSignedUsd(p.pnl)} ({fmtRoi(roiOf(p.pnl, p.margin))})</span>}{act.share && p.pnl !== null && <ShareIconBtn label={`Share ${p.coin} position`} onClick={() => openShare([fromPosition(p)])} />}</TableCell>
    <TableCell>{fmtUsd(p.margin)}</TableCell><TableCell className="tr-opt"><PositionAge position={p} /></TableCell>
    <TableCell kind="action" align="right"><ClosePositionBtn id={p.id} closing={closing} label={act.closeLabel} blocked={act.blocked} busy={act.busy} onClose={act.onClose} /></TableCell>
  </tr>
})

const QueuedOpenCard = memo(function QueuedOpenCard({ entry, closeLabel }: { entry: PendingEntry; closeLabel: string }) {
  const m = entry.meta ?? {}, dash = DASH_CELL
  return <li className="tr-card bb-queue-row" data-tone={m.isLong === undefined ? undefined : m.isLong ? 'up' : 'down'}>
    <div className="tr-card-top"><span className="tr-card-asset"><b>{m.coin ?? entry.action}</b> {m.isLong !== undefined && sideTxt(m.isLong)} {m.leverage !== undefined && <span>{m.leverage}×</span>}</span><span className="ui-muted ui-num">{dash}</span></div>
    <CardKV items={[['Size', m.size === undefined ? dash : fmtUsd(m.size)], ['Entry', dash], ['Margin', m.margin === undefined ? dash : fmtUsd(m.margin)], ['Bust', dash]]} />
    <div className="tr-card-actions"><PendingOpenAction entry={entry} label={closeLabel} variant="secondary" className="tr-card-close" /></div>
  </li>
})

const PositionCard = memo(function PositionCard({ p, closing, ...act }: RowProps) {
  const dash = DASH_CELL
  return <li className={'tr-card' + (closing ? ' bb-queue-row' : '')} data-tone={p.isLong ? 'up' : 'down'}>
    <div className="tr-card-top"><span className="tr-card-asset"><b>{p.coin}</b> {sideTxt(p.isLong)} <span>{p.leverage}×</span></span>
      <span className={'ui-num ' + (p.pnl === null ? 'ui-muted' : toneClass(p.pnl))}>{p.pnl === null ? dash : <>{fmtSignedUsd(p.pnl)} ({fmtRoi(roiOf(p.pnl, p.margin))})</>}{act.share && p.pnl !== null && <ShareIconBtn label={`Share ${p.coin} position`} onClick={() => openShare([fromPosition(p)])} />}</span></div>
    <CardKV items={[['Size', fmtUsd(p.size)], ['Entry', fmtPrice(p.entry, priceDecimals(p.coin))], ['Mark', fmtPrice(p.mark, priceDecimals(p.coin))], ['Margin', fmtUsd(p.margin)], ['Bust', <span className="ui-warn">{fmtPrice(p.bust, priceDecimals(p.coin))}</span>], ['Age', <PositionAge position={p} />]]} />
    <div className="tr-card-actions"><ClosePositionBtn id={p.id} closing={closing} label={act.closeLabel} blocked={act.blocked} busy={act.busy} onClose={act.onClose} variant="secondary" className="tr-card-close" /></div>
  </li>
})

export function TradeRows({ rows, highlight, mobileCards = false, cardsMedia = PHONE }: { rows: TradeRow[]; highlight?: Set<string>; mobileCards?: boolean; cardsMedia?: string }) {
  const cards = useMedia(cardsMedia, mobileCards)
  const { token } = sym()
  // Only losses mint; a win or an unknown amount reads as a dash.
  const minted = (r: TradeRow) => (r.paperMinted !== null && r.paperMinted > 0 ? <span className="ui-up">{fmtMinted(r.paperMinted)}</span> : DASH)
  const tags = (r: TradeRow) => <>{r.liquidated && <Tag tone="down" caps className="tr-asset-tag">Liquidated</Tag>}{!!r.queued && r.queued > 0 && <Tag tone="warn" caps className="tr-asset-tag" title="Winnings waiting to be paid out. They pay automatically, oldest first.">Queued {fmtUsd(r.queued)}</Tag>}</>
  if (cards) return (
    <ol className="tr-cards" role="list">{rows.map((r) => {
      const roi = r.pnl === null ? null : roiOf(r.pnl, r.margin, r.liquidated)
      return <li key={String(r.id)} className={'tr-card' + (highlight?.has(String(r.id)) ? ' is-me' : '')} data-tone={r.isLong ? 'up' : 'down'}>
        <div className="tr-card-top"><span className="tr-card-asset"><b>{r.coin}</b> {sideTxt(r.isLong)} <span>{r.leverage}×</span></span>
          <span className="ui-num">{r.pnl === null || roi === null ? '—' : <><span className={toneClass(r.pnl)}>{fmtSignedUsd(r.pnl)}</span> <span className={toneClass(roi)}>({fmtRoi(roi)})</span><ShareIconBtn label={`Share ${r.coin} trade`} onClick={() => openShare([fromTrade(r)])} /></>}</span></div>
        <div className="tr-card-tags">{tags(r)}</div>
        <CardKV items={[['Size', fmtUsd(r.size)], ['Entry', fmtPrice(r.entry, priceDecimals(r.coin))], ['Exit', fmtPrice(r.exit, priceDecimals(r.coin))], [`${token} minted`, minted(r)], ['Closed', timeAgo(r.closedAt)]]} />
      </li>
    })}</ol>
  )
  return (
    <div className="bb-scroll-x tr-table-wrap"><table className="ui-table tr-table tr-table--hist">
      <thead><tr><TableHeaderCell className="tr-col-asset">Asset</TableHeaderCell><TableHeaderCell className="tr-col-side">Side</TableHeaderCell><TableHeaderCell className="tr-col-size">Size</TableHeaderCell><TableHeaderCell className="tr-col-price">Entry</TableHeaderCell><TableHeaderCell className="tr-col-price">Exit</TableHeaderCell><TableHeaderCell className="tr-col-pnl"><Tooltip content="ROI% = PnL / Margin * 100%">PnL (ROI%)</Tooltip></TableHeaderCell><TableHeaderCell className="tr-col-minted">{token} minted</TableHeaderCell><TableHeaderCell className="tr-col-age">Closed</TableHeaderCell></tr></thead>
      <tbody>{rows.map((r) => {
        const roi = r.pnl === null ? null : roiOf(r.pnl, r.margin, r.liquidated)
        return <tr key={String(r.id)} className={highlight?.has(String(r.id)) ? 'is-me' : undefined} data-tone={r.isLong ? 'up' : 'down'}>
          <AssetCell coin={r.coin} lev={r.leverage} sub={tags(r)} />
          <TableCell>{sideTxt(r.isLong)}</TableCell><TableCell>{fmtUsd(r.size)}</TableCell><TableCell>{fmtPrice(r.entry, priceDecimals(r.coin))}</TableCell><TableCell>{fmtPrice(r.exit, priceDecimals(r.coin))}</TableCell>
          <TableCell>{r.pnl === null || roi === null ? '—' : <><span className={toneClass(r.pnl)}>{fmtSignedUsd(r.pnl)}</span> <span className={toneClass(roi)}>({fmtRoi(roi)})</span><ShareIconBtn label={`Share ${r.coin} trade`} onClick={() => openShare([fromTrade(r)])} /></>}</TableCell><TableCell className="ui-num">{minted(r)}</TableCell><TableCell><span className="ui-muted">{timeAgo(r.closedAt)}</span></TableCell>
        </tr>
      })}</tbody>
    </table></div>
  )
}

/** Close all: the trigger opens a confirmation popover anchored to it (bottom sheet on phones) with count and live est. PnL.
 *  Losing readiness unmounts it. */
export function CloseAll() {
  const { address, account, loaded, accountError } = useTrader()
  if (!address) return null
  if (!account || !loaded || accountError) return <Button size="sm" className="tr-closeall" disabled>Close all</Button>
  return <ReadyCloseAll key={`${address.toLowerCase()}:${cfg().scope}`} />
}

function ReadyCloseAll() {
  const { address, account, loaded, accountError, positions, executionMode } = useTrader()
  const livePositionsNow = useLivePositions(positions)
  const [ask, setAsk] = useState(false)
  const [closing, setClosing] = useState(false)
  const [done, setDone] = useState(0)
  const [place, setPlace] = useState<CSSProperties>()
  const cancel = useRef(false)
  const wrap = useRef<HTMLSpanElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const pop = useRef<HTMLDivElement>(null)
  const titleId = useId()
  useEffect(() => () => { cancel.current = true }, [address])
  const batchSize = maxCloseIds()
  const { entries } = useStore(pendingStore)
  const hasClosing = entries.some(e => e.action === 'Close')
  const n = account?.positionsCount ?? 0
  // Positions load one page at a time; past the first page the account totals cover every position.
  const complete = positions.length >= n
  const live = complete ? livePositionsNow.map(p => p.pnl) : []
  const estPnl = complete ? (live.some(v => v === null) ? null : live.reduce<number>((a, v) => a + (v ?? 0), 0)) : account?.openPnl ?? null
  const margin = complete ? positions.reduce((a, p) => a + p.margin, 0) : account?.marginInUse ?? 0
  const tone = netTone(estPnl ?? 0)
  const estTxt = estPnl === null ? '—' : fmtSignedUsd(estPnl)
  const byCoin = complete ? Object.entries(positions.reduce<Record<string, number>>((a, p) => { a[p.coin] = (a[p.coin] ?? 0) + 1; return a }, {})).map(([c, k]) => `${c} ${k}`).join(' · ') : ''
  const batches = Math.ceil(n / batchSize)
  const signNote = executionMode === 'wallet'
    ? `Confirm ${batches > 1 ? `${batches} transactions` : 'in your wallet'} · you pay network gas.`
    : batches > 1 ? `Runs in ${batches} batches of ${batchSize}.` : ''
  const disabledWhy = !n ? 'No open positions' : hasClosing ? 'A close is already in progress' : !loaded || accountError ? 'Account is still loading' : ''
  const dismiss = useCallback(() => { setAsk(false); trigger.current?.focus() }, [])
  useClickOutside(wrap, dismiss, ask)
  useLayoutEffect(() => {
    if (!ask) return
    // Fixed, so the dock's clip never cuts it; opens upward without room below. Re-anchored on scroll, resize, when the
    // trigger, its dock/tab row or the popover resizes, and every 500 ms for moves none of those report. Phones use a bottom sheet: nothing is measured.
    const sheet = matchMedia(PHONE)
    let frame = 0, last = ''
    const measure = () => {
      frame = 0
      if (sheet.matches) { if (last) { last = ''; setPlace(undefined) } return }
      const r = trigger.current?.getBoundingClientRect()
      if (!r) return
      const h = pop.current?.offsetHeight ?? 0
      const up = innerHeight - r.bottom < h + 12 && r.top > innerHeight - r.bottom
      const key = [r.top, r.right, h, innerWidth, innerHeight].join()
      if (key !== last) { last = key; setPlace({ '--ca-right': Math.max(8, innerWidth - r.right) + 'px', [up ? '--ca-bottom' : '--ca-top']: (up ? innerHeight - r.top : r.bottom) + 6 + 'px' } as CSSProperties) }
    }
    const follow = () => { if (!frame) frame = requestAnimationFrame(measure) }
    measure()
    const ro = new ResizeObserver(follow)
    for (const el of [trigger.current, pop.current, wrap.current?.closest('.tr-dock, .pf-tabs-line')]) if (el) ro.observe(el)
    const slow = setInterval(follow, 500)
    addEventListener('scroll', follow, { capture: true, passive: true })
    addEventListener('resize', follow)
    sheet.addEventListener('change', follow)
    pop.current?.querySelector<HTMLButtonElement>('button')?.focus()
    return () => { cancelAnimationFrame(frame); ro.disconnect(); clearInterval(slow); removeEventListener('scroll', follow, { capture: true }); removeEventListener('resize', follow); sheet.removeEventListener('change', follow) }
  }, [ask])
  useEffect(() => { if (ask && (!n || hasClosing)) setAsk(false) }, [ask, n, hasClosing])
  const run = async () => {
    if (!address || !loaded || accountError || !n || hasClosing || closing) return
    const owner = address.toLowerCase(), scope = cfg().scope
    cancel.current = false; setClosing(true); setDone(0); setAsk(false)
    try {
      // Every id open now; positions opened after this point are not closed.
      const ids = await allOpenPositionIds(owner)
      let sent = 0
      for (let i = 0; i < ids.length; i += batchSize) {
        if (walletStore.get().address?.toLowerCase() !== owner || cfg().scope !== scope) { toast('warning', 'Close all stopped', 'Wallet changed.'); return }
        if (cancel.current) { toast('warning', 'Close all stopped', `${sent} sent, the rest stay open.`); return }
        const batch = ids.slice(i, i + batchSize)
        if (!await closePositions(batch, { quiet: true })) return
        sent += batch.length
        setDone(sent)
      }
      toast('info', `Closing ${sent} ${sent === 1 ? 'position' : 'positions'}`)
    } catch (e) { toast('error', 'Close all stopped', errMsg(e)) } finally { setClosing(false); void refreshAccount() }
  }
  if (closing) return <div className="tr-closeall-live" role="status"><span className="ui-num">Closing {done}/{n}…</span><Button size="sm" onClick={() => { cancel.current = true }}>Stop after this batch</Button></div>
  const plural = n === 1 ? 'position' : 'positions'
  // Escape inside stops here so the enclosing mobile sheet stays open; useClickOutside handles Escape elsewhere.
  return (
    <span ref={wrap} className="tr-closeall-wrap" onKeyDown={(e) => { if (e.key === 'Escape' && ask) { e.stopPropagation(); dismiss() } }}>
      <Button ref={trigger} size="sm" className={'tr-closeall' + (ask ? ' is-pressed' : '')} disabled={!address || !loaded || !!accountError || !n || hasClosing} aria-haspopup="dialog" aria-expanded={ask} onClick={() => setAsk((v) => !v)} title={disabledWhy || `Close every open position at the oracle price · est. ${estTxt}`}>Close all</Button>
      {ask && <div ref={pop} className="tr-closeall-pop ui-anim-pop-in" role="dialog" aria-modal="false" aria-labelledby={titleId} style={place}>
        <b id={titleId} className="tr-closeall-title">Close {n} {plural}</b>
        <small className="tr-closeall-sub">Market close at the oracle price{byCoin && ` · ${byCoin}`}</small>
        <dl className="tr-closeall-sum">
          <div><dt>Est. PnL</dt><dd className={'ui-num ' + toneClass(tone)}>{estTxt}</dd></div>
          <div><dt>Margin released</dt><dd className="ui-num">{fmtUsd(margin)}</dd></div>
          <div className="is-net"><dt>Back to balance</dt><dd className="ui-num">≈ {estPnl === null ? '—' : fmtUsd(Math.max(0, margin + estPnl))}</dd></div>
        </dl>
        <small className="tr-closeall-sub">Estimate at the current price; it moves until the close fills.</small>
        <span className="tr-closeall-btns">
          <Button onClick={() => dismiss()}>Cancel</Button>
          <Button variant="danger" disabled={!loaded || !!accountError || !n || hasClosing} onClick={() => void run()}>Close {n} {plural}</Button>
        </span>
        {signNote && <small className="tr-closeall-sub is-center">{signNote}</small>}
      </div>}
    </span>
  )
}

/** One queue-aware Positions lifecycle for the trade dock and portfolio. */
export function SharedPositions({ share = false, showEmptyTable = false, mobileCards = false, cardsMedia, empty = 'No open positions. Your next trade appears here.' }: { share?: boolean; showEmptyTable?: boolean; mobileCards?: boolean; cardsMedia?: string; empty?: ReactNode }) {
  const { address, account, positions, loaded, accountError } = useTrader()
  const { entries, storageError } = useStore(pendingStore)
  const ready = !!address && loaded && !!account && !accountError
  const visibleRows = pendingPositionRows(positions, entries)
  return <>
    {address && storageError && <p className="tr-alert" role="alert">{storageError}</p>}
    {(showEmptyTable || (address && visibleRows.length > 0)) && <PositionRows key={address ?? 'disconnected'} positions={address ? positions : []} share={share} mobileCards={mobileCards} cardsMedia={cardsMedia} />}
    {!address ? <EmptyState icon="wallet" size="sm" action={<Button size="sm" onClick={() => openModal('connect')}>Connect wallet</Button>}>Your positions show here.</EmptyState>
      : <>{!ready && <DataNotice error={accountError || undefined} loading={!accountError} shape="table" label="open positions" onRetry={() => void refreshAccount()} />}
        {ready && !visibleRows.length && <EmptyState icon={null} size="sm">{empty}</EmptyState>}
        {ready && <PositionsPager />}</>}
  </>
}

/** Positions · History · Status dock under the chart. */
export function PositionsDock({ tab, setTab, feed }: { tab: string; setTab: (t: string) => void; feed?: ReactNode }) {
  const { address, positionsCount } = useTrader()
  const [page, setPage] = useState(1)
  const [size, setSize] = usePageSize('bb.dock.size')
  const { data, error, loading, reload } = useApi(address && tab === 'history' ? tradesKey(address, page, size) : null, () => getHistory<TradeRow>(address!, 'trades', page, size), 6000)
  useEffect(() => { setPage(1) }, [address])
  useEffect(() => { if (data && data.page !== page) setPage(data.page) }, [data, page])
  // History loads only while open, so it carries no count: one popping in would shift the tabs.
  const items = [{ value: 'positions', label: 'Positions', count: positionsCount ?? undefined, countLoading: positionsCount === undefined }, { value: 'history', label: 'History' }, { value: 'status', label: 'Status' }]
  return (
    <section className="tr-dock" aria-label="Positions">
      <div className="tr-dock-bar">
        <Tabs className="tr-dock-tabs" label="Positions dock" idBase="dock" items={items} value={tab} onChange={setTab} />
        {feed}
        <CloseAll key={`${address}:${tab}`} />
      </div>
      <div className="tr-dock-body" {...tabPanelProps('dock', tab)}>
      {tab === 'positions' && <SharedPositions key={address ?? 'disconnected'} share />}
      {tab === 'history' && (!address ? <EmptyState icon="history" size="sm" action={<Button size="sm" onClick={() => openModal('connect')}>Connect wallet</Button>}>Your closed trades show here.</EmptyState>
        : !data ? <DataNotice shape="table" error={error} loading={loading} label="trade history" onRetry={reload} />
        : data.rows.length ? <><TradeRows rows={data.rows} /><Pagination page={data.page} hasNext={!!data.nextCursor} total={data.summary?.count} size={size} setPage={setPage} setSize={setSize} rows={data.rows.length} /></>
        : <EmptyState icon="history" size="sm">No closed trades yet.</EmptyState>)}
      {tab === 'status' && <StatusTab />}
      </div>
    </section>
  )
}
