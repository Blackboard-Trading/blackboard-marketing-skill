import { useEffect, useRef, useState } from 'react'
import { claimEpoch, harvestEpoch, redeemEpoch } from '../lib/actions'
import { amountState } from '../lib/amount-state'
import { epochPayoutOf, epochPhase, epochPayoutStatus, epochScheduleLabel, getEpochs, type EpochHistory } from '../lib/epochs'
import { focusBoxInput, useApi, useNow, useTrader } from '../lib/hooks'
import { DASH, fmtDateTime, fmtDayMinute, fmtNum, fmtUsd, formatRaw, parseAmount, rawBig, unitsOf } from '../lib/format'
import { refreshAccount } from '../lib/account'
import { configStore, sym } from '../lib/config'
import { useStore } from '../lib/store'
import { estimatePayout, perChalkOf } from '../lib/trade-math'
import { AnimatedNumber, BbIcon, Button, Chip, DataNotice, EmptyState, Field, InputShell, KeyValue, Modal, StatusDot, TableCell, TableHeaderCell } from './primitives'

const pad = (n: number) => String(n).padStart(2, '0')
/** "1d 23h 01m" · under an hour "12m 05s". */
function bbCountdown(seconds: number) {
  const s = Math.max(0, Math.floor(seconds)), d = Math.floor(s / 86400), h = Math.floor(s % 86400 / 3600), m = Math.floor(s % 3600 / 60)
  return d ? `${d}d ${h}h ${pad(m)}m` : h ? `${h}h ${pad(m)}m` : `${m}m ${pad(s % 60)}s`
}
const fmtShort = (sec: number) => fmtDateTime(sec * 1000)
/** Timeline date: the full stamp, or `dd/MM HH:mm` on phones so the three marks never overlap. */
const markDate = (sec: number | null | undefined) => (sec == null ? DASH : <><span className="ck-date-full">{fmtShort(sec)}</span><span className="ck-date-short">{fmtDayMinute(sec * 1000)}</span></>)
const clock = (ms: number) => { const d = new Date(ms); return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}` }
const fmtChalk = (n: number | null) => fmtNum(n, 2)
const fmtShare = (share: number | null) => (share === null ? DASH : (share * 100).toFixed(2) + '%')
const clamp01 = (x: number) => Math.min(1, Math.max(0, x))
const PENDING = new Set(['queued', 'claimed', 'sent'])
/** Tooltip of a round's collect button while its signed auto-collect is still pending. */
const autoClaimNote = (row: EpochHistory) => (row.autoClaim && PENDING.has(row.autoClaim.status) ? `Auto-collect authorized (${row.autoClaim.status}); you can still collect manually` : undefined)

const STALE_S = 15

/** The epoch read behind the redeem card and the CHALK stats: one key per wallet, so both share each poll. */
export function useEpochs(address: string | null | undefined, cursor: string | undefined, intervalMs: number, enabled = true) {
  const scope = useStore(configStore, s => s.cfg.scope)
  const queryKey = `epochs:${scope}:${address || 'public'}:${cursor || ''}`
  const q = useApi(enabled ? queryKey : null, async () => {
    const state = await getEpochs(address || undefined, cursor)
    const scheduleLabel = !state.started ? 'Epoch clock not started' : epochScheduleLabel(state)
    return { state, scheduleLabel, user: address?.toLowerCase() || '', receivedAt: Date.now() }
  }, intervalMs)
  return { queryKey, ...q }
}

/** Polls every 5 s while the redeem view is open, the user is working in the card, or a window boundary is near; otherwise every 10 s, with the clocks ticking locally. */
export function EpochPanel({ focused = false }: { focused?: boolean }) {
  const { address } = useTrader()
  const { cfg: deployment } = useStore(configStore)
  const T = sym(deployment)
  const [cursor, setCursor] = useState<string | undefined>()
  const [historyOpen, setHistoryOpen] = useState(false)
  useEffect(() => { setCursor(undefined) }, [address])
  const [amount, setAmount] = useState('')
  const [busy, setBusy] = useState<string | null>(null)
  const [engaged, setEngaged] = useState(false)
  const [near, setNear] = useState(false)
  const fast = focused || engaged || near || historyOpen || !!busy || amount !== ''
  // The next poll starts after the last response, so the idle cadence stays under STALE_S with room for a slow read.
  const { queryKey, data: fresh, error, loading, reload } = useEpochs(address, cursor, fast ? 5000 : 10000)
  // A cadence change restarts the query; keep showing the last snapshot (its age still gates signing) instead of blanking.
  const last = useRef<{ key: string; value: NonNullable<typeof fresh> }>(undefined)
  if (fresh) last.current = { key: queryKey, value: fresh }
  const data = fresh ?? (!error && last.current?.key === queryKey ? last.current.value : undefined)
  useEffect(() => {
    const onVisible = () => { if (document.visibilityState === 'visible') reload() }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [reload])
  const now = useNow(1000)
  const epoch = data?.user === (address?.toLowerCase() || '') ? data.state : undefined
  const age = data ? Math.floor((now - data.receivedAt) / 1000) : 0
  const stale = !!data && age > STALE_S
  // Redemption starts paused; until its first unpause there is no epoch clock to show.
  const sched = epoch && epoch.started && epoch.closeAt !== null && epoch.redeemOpenAt !== null ? { closeAt: epoch.closeAt, redeemOpenAt: epoch.redeemOpenAt } : undefined
  const phase = epoch && sched ? epochPhase(epoch.phase) : undefined
  const parsed = parseAmount(amount, unitsOf().token), rawAmount = parsed !== null && parsed > 0n ? parsed : null
  const walletRaw = epoch?.walletChalkRaw && /^\d+$/.test(epoch.walletChalkRaw) ? BigInt(epoch.walletChalkRaw) : null
  const a = rawAmount !== null ? Number(formatRaw(rawAmount, unitsOf().token, 8)) : 0
  // undefined: nothing entered; null: an input of the estimate is unavailable.
  const estimate = epoch && rawAmount !== null ? (epoch.indicativeRewardPot !== null && epoch.totalRedeemed !== null ? estimatePayout(a, epoch.totalRedeemed, epoch.indicativeRewardPot) : null) : undefined
  const perChalk = epoch && epoch.indicativeRewardPot !== null && epoch.totalRedeemed !== null ? perChalkOf(epoch.indicativeRewardPot, epoch.totalRedeemed) : null
  // Elapsed chain time since the snapshot, so the countdown keeps moving between polls.
  const chainNow = epoch ? epoch.chainTimestamp + Math.max(0, Math.floor((now - (data?.receivedAt ?? now)) / 1000)) : 0
  const progress = sched ? clamp01((chainNow - sched.redeemOpenAt) / Math.max(1, sched.closeAt - sched.redeemOpenAt)) : 0
  const startAt = sched && epoch?.epochDurationSec ? sched.closeAt - epoch.epochDurationSec : null
  const waitProgress = !sched ? 0 : phase !== 'waiting' ? 1 : startAt !== null ? clamp01((chainNow - startAt) / Math.max(1, sched.redeemOpenAt - startAt)) : 0
  async function action(label: string, run: () => Promise<boolean>) {
    setBusy(label)
    try { if (await run()) { setAmount(''); reload(); void refreshAccount() } } finally { setBusy(null) }
  }

  // Three states: waiting (epoch running, burning not open yet), open (burn window), due (closed, finalize then claim).
  const status = !epoch ? (error ? 'Epoch unavailable' : 'Loading epoch') : !sched ? (epoch.paused ? 'Paused' : 'Not started') : phase === 'open' ? 'Ends in' : phase === 'due' ? 'Closed' : 'Opens in'
  const target = sched ? (phase === 'waiting' ? sched.redeemOpenAt : sched.closeAt) - chainNow : 0
  const nearBoundary = !!sched && phase !== 'due' && target <= 30
  useEffect(() => setNear(nearBoundary), [nearBoundary])
  const reason = !epoch ? 'Epoch unavailable' : !sched ? 'Not started' : stale ? 'Refresh first' : phase === 'waiting' ? 'Cooldown' : phase === 'due' ? 'Epoch closed' : undefined
  const st = amountState({ text: amount, dp: unitsOf().token, symbol: T.token, action: 'Redeem', available: walletRaw, blocked: reason, busy: busy === 'redeem' })
  // Closed rounds only: the live epoch is the panel itself.
  const rounds = (epoch?.history || []).filter(r => r.epochId !== epoch?.epochId && r.closeAt > 0)
  const uncollected = rounds.filter(r => epochPayoutStatus(r).kind === 'claim')
  const claimTotal = address && epoch && rounds.length ? (uncollected.some(r => r.claimable === null) ? null : uncollected.reduce((s, r) => s + (r.claimable ?? 0), 0)) : undefined

  // Your share of the pot if the epoch closed now; with a typed amount, the estimate including it.
  const earnings = estimate !== undefined ? estimate : address && epoch && epoch.userRedeemed !== null && epoch.totalRedeemed !== null && epoch.indicativeRewardPot !== null ? (epoch.userRedeemed === 0 ? 0 : epoch.totalRedeemed > 0 ? epoch.indicativeRewardPot * epoch.userRedeemed / epoch.totalRedeemed : null) : null

  return <section className="ck-panel ck-redeem" aria-label="Redeem" onFocus={() => setEngaged(true)} onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setEngaged(false) }}>
    <div className="ck-epoch">
      <div className="ck-card-head">
        <h2 className="ck-card-title">Redemption{epoch && ` #${epoch.epochId}`}</h2>
        {rounds.length > 0 && <button type="button" className="ck-epoch-link" aria-haspopup="dialog" onClick={() => setHistoryOpen(true)}>Past epochs<BbIcon n="next" s={14} /></button>}
      </div>
      <DataNotice error={error || (stale ? 'Epoch data is out of date. Refresh before redeeming.' : undefined)} loading={!epoch && loading} label="epoch" onRetry={reload} />
      <div className="ck-card-row">
        <div className="ck-lead">
          <small title="Redeem pool">Est. value</small>
          <span className="ck-lead-line"><b className="ui-display ui-num ck-yellow"><AnimatedNumber value={epoch ? fmtUsd(epoch.indicativeRewardPot) : DASH} /></b>{perChalk !== null && <small>{fmtUsd(perChalk)} / {T.token}</small>}</span>
        </div>
        <div className="ck-lead ck-lead--end">
          <small>{status}</small>
          <b className={'ui-display ui-num ck-countdown' + (phase === 'open' ? ' is-open' : phase === 'due' ? ' is-closed' : '')} aria-live="off">{sched ? (phase === 'due' ? 'Claim' : bbCountdown(target)) : DASH}</b>
        </div>
      </div>
      <div className={'ck-timeline' + (phase ? ' is-' + phase : '')}>
        <div className="ck-track" aria-hidden>
          <i className="ck-tick" /><span className="ck-seg ck-seg--wait"><i style={{ transform: `scaleX(${waitProgress})` }} /></span>
          <i className="ck-tick" /><span className="ck-seg ck-seg--window"><i style={{ transform: `scaleX(${progress})` }} /></span><i className="ck-tick" />
        </div>
        <div className="ck-progress" role="progressbar" aria-label="Redeem window elapsed" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress * 100)} />
        <ol className="ck-marks">
          <li className={phase === 'waiting' ? 'is-now' : undefined}><b>Open</b><span className="ui-num">{markDate(startAt)}</span></li>
          <li className={phase === 'open' ? 'is-now' : undefined}><b title={`Burn ${T.token} from here until the epoch closes`}>Redeem</b><span className="ui-num">{markDate(sched?.redeemOpenAt)}</span></li>
          <li className={phase === 'due' ? 'is-now' : undefined}><b title="Collect payouts once the epoch is finalized">Claim</b><span className="ui-num">{markDate(sched?.closeAt)}</span></li>
        </ol>
      </div>
      {phase === 'due' && !epoch?.paused && <Button variant="secondary" size="md" className="ck-finalize" loading={busy === 'harvest'} disabled={!address || !epoch || stale || !!busy} onClick={() => epoch && void action('harvest', () => harvestEpoch(epoch.epochId))}>Finalize epoch</Button>}
    </div>
    <div className="ck-redeem-you">
      {address && <div className="ck-card-row">
        <div className="ck-lead">
          <small>Est. rewards</small>
          <b className="ui-display ui-num">{earnings === null || earnings === undefined ? DASH : <AnimatedNumber value={fmtUsd(earnings)} />}</b>
        </div>
        <div className="ck-lead ck-lead--end">
          <small>You burned</small>
          <b className="ui-display ui-num ck-lead-sub">{epoch ? <AnimatedNumber value={fmtChalk(epoch.userRedeemed)} /> : DASH}</b>
        </div>
      </div>}
      {claimTotal !== undefined && claimTotal !== 0 && <div className="ck-rows"><KeyValue label="To collect from past epochs" value={fmtUsd(claimTotal)} /></div>}
      <div className="ck-forms">
        <Field label="Burn" htmlFor="epoch-amount">
          <div className="ck-form-row">
            <InputShell align="left" className="ck-form-input" state={st.invalid ? 'error' : 'default'} disabled={!!busy || !address} onMouseDown={focusBoxInput}
              leading={<Chip disabled={walletRaw === null || walletRaw === 0n || !!busy} onClick={() => { setAmount(walletRaw === null ? '' : formatRaw(walletRaw, unitsOf().token)) }}>Max</Chip>} trailing={T.token}>
              <input id="epoch-amount" inputMode="decimal" maxLength={80} autoComplete="off" placeholder="0.0" value={amount} disabled={!!busy || !address} aria-invalid={st.invalid}
                onChange={e => setAmount(e.target.value.replace(/[^\d.]/g, ''))} />
            </InputShell>
            {!address
              ? <Button variant="chalk" size="lg" className="ck-form-btn" disabled>Redeem</Button>
              : <Button variant="chalk" size="lg" className="ck-form-btn" loading={busy === 'redeem'} disabled={st.disabled || !!busy} onClick={() => epoch && void action('redeem', () => redeemEpoch(epoch.epochId, amount, false, sched?.closeAt))}>{st.label}</Button>}
          </div>
        </Field>
        {address && <p className="ck-hint">Available <b className="ui-num">{walletRaw === null ? DASH : fmtChalk(Number(formatRaw(walletRaw, unitsOf().token, 6)))}</b></p>}
      </div>
    </div>
    {(stale || error) && <div className="ck-panel-foot"><span className="ck-meta"><StatusDot tone="warn" />Out of date</span></div>}
    {historyOpen && <Modal title="Past epochs" placement="center" busy={!!busy} onClose={() => setHistoryOpen(false)} className="ck-history">
      <ClaimHistory rounds={rounds} address={address} epochLoaded={!!epoch} error={error} loading={loading} reload={reload} busy={busy} stale={stale} token={T.token}
        onClaim={(id) => void action('claim:' + id, () => claimEpoch(id))} />
      <div className="ck-pages">
        {epoch?.historyNext && <Button size="sm" disabled={!!busy || loading} onClick={() => setCursor(epoch.historyNext || undefined)}>Older epochs</Button>}
        {cursor && <Button size="sm" disabled={!!busy || loading} onClick={() => setCursor(undefined)}>Back to latest</Button>}
      </div>
    </Modal>}
  </section>
}

function ClaimHistory({ rounds, address, epochLoaded, error, loading, reload, busy, stale, token, onClaim }: {
  rounds: EpochHistory[]; address?: string | null; epochLoaded: boolean; error?: string; loading: boolean; reload: () => void
  busy: string | null; stale: boolean; token: string; onClaim: (epochId: string) => void
}) {
  if (!rounds.length) return epochLoaded ? <EmptyState size="sm" icon="epoch">No closed epochs yet.</EmptyState> : <DataNotice error={error} loading={loading} label="past rounds" onRetry={reload} />
  // One row per closed epoch, newest first. Connected wallets also see their burn, payout and a Claim button.
  const me = !!address
  // Your payout and its state in one cell: "--" without a burn, the amount once claimed, a Claim button otherwise.
  const receive = (row: EpochHistory, payout: number | null) => {
    const st = epochPayoutStatus(row)
    if (st.kind === 'claim') return <Button size="sm" variant="primary" loading={busy === 'claim:' + row.epochId} disabled={!!busy || stale} onClick={() => onClaim(row.epochId)}>Claim {fmtUsd(payout)}</Button>
    if (st.kind === 'paid') return <span className="ui-up">{fmtUsd(payout)}</span>
    return <span className="ui-muted">{DASH}</span>
  }
  return <div className="bb-scroll-x"><table className="ui-table ck-rounds-table">
    <thead><tr>
      <TableHeaderCell>Epoch</TableHeaderCell>
      <TableHeaderCell align="right">Total burned</TableHeaderCell>
      <TableHeaderCell align="right">Total payout</TableHeaderCell>
      <TableHeaderCell align="right">Rate</TableHeaderCell>
      {me && <><TableHeaderCell align="right">Your burn</TableHeaderCell><TableHeaderCell align="right">You receive</TableHeaderCell></>}
    </tr></thead>
    <tbody>{rounds.map(row => {
      const { payout } = epochPayoutOf(row)
      const rate = row.rewardPot !== null && row.totalRedeemed ? row.rewardPot / row.totalRedeemed : null
      return <tr key={row.epochId} className={!row.totalRedeemed ? 'is-empty' : undefined}>
        <TableCell>#{row.epochId}</TableCell>
        <TableCell align="right">{fmtChalk(row.totalRedeemed)} {token}</TableCell>
        <TableCell align="right">{fmtUsd(row.rewardPot)}</TableCell>
        <TableCell align="right">{rate === null ? DASH : `1 ${token} = ${fmtUsd(rate)}`}</TableCell>
        {me && <>
          <TableCell align="right">{row.userRedeemed ? `${fmtChalk(row.userRedeemed)} ${token}` : DASH}</TableCell>
          <TableCell align="right">{receive(row, payout)}</TableCell>
        </>}
      </tr>
    })}</tbody>
  </table></div>
}
