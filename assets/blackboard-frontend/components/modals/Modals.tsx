import { useEffect, useRef, useState } from 'react'
import { DASH, fmtUsd, shortAddr } from '../../lib/format'
import { focusBoxInput, useTrader } from '../../lib/hooks'
import { claimUsername, deposit, enableTrading, faucet, readCollateralBalance, revokeTradingSession, USERNAME_RE, withdraw } from '../../lib/actions'
import { useStore } from '../../lib/store'
import { closeModal, dismissToast, errMsg, openModal, toast, toastStore, uiStore, updateToast, type Toast } from '../../lib/toast'
import { burnerEnabled, clearSession, connectBurner, connectInjected, loadSession, providersStore, sessionValid, walletStore, type ProviderDetail } from '../../lib/wallet'
import { sessionDaysRemaining } from '../../lib/session-clock'
import { exactAmount, formatRaw, unitsOf, usdOf } from '../../lib/format'
import { accountStore, refreshAccount } from '../../lib/account'
import { dismissableDeposit, dismissUnconfirmedDeposit, hasUnconfirmedDeposit, pendingStore } from '../../lib/pending'
import { executionMode, executionStore, setExecutionMode, walletExecutionAvailable } from '../../lib/execution'
import { cfg, configStore, sym, v1 } from '../../lib/config'
import { BbIcon, type BbIconName } from '../BbIcon'
import { Button, Chip, DataNotice, Field, InputShell, Modal, Segmented, Skeleton, Tooltip } from '../primitives'
import { acceptReferral, dismissReferral, referralStore, resolveReferralCode } from '../../lib/referral'
import { inviteFor } from '../../lib/referral-invite'
import { amountState } from '../../lib/amount-state'
import { CopyBtn } from '../ui'
import metamaskIcon from '../../assets/wallets/metamask.svg'
import coinbaseIcon from '../../assets/wallets/coinbase.svg'
import walletConnectIcon from '../../assets/wallets/walletconnect.svg'
import phantomIcon from '../../assets/wallets/phantom.png'

function NeedWallet({ what }: { what: string }) {
  return (
    <div className="bb-flow-empty">
      <span>Connect your wallet to {what}.</span>
      <Button variant="primary" onClick={() => openModal('connect')}>Connect wallet</Button>
    </div>
  )
}

/** After connecting: just close. One-click trading is turned on from Trade when the user chooses to. */
function afterConnect(_addr: string) {
  openModal(null)
}

const coll = () => cfg().collateralSymbol || 'collateral'
/** Session lifetime from GET /v1/config `params.sessionMaxSec`. */
const sessionDays = () => Math.floor((cfg().raw?.params.sessionMaxSec ?? 0) / 86400)
const usd = (raw: string | bigint) => usdOf(raw) ?? 0
const num = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
/** Pending toast around a wallet signature; the action's own toast takes over when it resolves. */
async function withSignToast<T>(title: string, message: string, run: () => Promise<T>): Promise<T> {
  const id = toast('pending', title, message)
  try { return await run() } finally { dismissToast(id) }
}

/** Well-known wallets offered for install when not detected (EIP-6963 rdns; name as a fallback for legacy injection). */
const KNOWN = [
  { rdns: 'io.metamask', name: 'MetaMask', url: 'https://metamask.io/download/', icon: metamaskIcon },
  { rdns: 'com.coinbase.wallet', name: 'Coinbase Wallet', url: 'https://www.coinbase.com/wallet/downloads', icon: coinbaseIcon },
  { rdns: 'app.phantom', name: 'Phantom', url: 'https://phantom.com/download', icon: phantomIcon },
]
/** Dev-only burner: hidden from users; tests and agents set localStorage 'bb:dev-burner' = '1' before opening this modal. */
const devBurner = () => { try { return localStorage.getItem('bb:dev-burner') === '1' && burnerEnabled() } catch { return false } }

function ConnectModal() {
  const { list } = useStore(providersStore)
  const { connecting } = useStore(walletStore)
  const [busy, setBusy] = useState<string | null>(null)
  const pick = async (d: ProviderDetail) => {
    setBusy(d.info.uuid)
    const id = toast('pending', 'Connecting wallet', `Approve the request in ${d.info.name}.`)
    try {
      const a = await connectInjected(d)
      updateToast(id, { kind: 'success', title: 'Wallet connected', message: shortAddr(a) })
      afterConnect(a)
    } catch (e) {
      const m = errMsg(e)
      if (/user rejected|denied|rejected the request/i.test(m)) updateToast(id, { kind: 'info', title: 'Connection cancelled' })
      else updateToast(id, { kind: 'error', title: 'Wallet connection failed', message: m })
    } finally {
      setBusy(null)
    }
  }
  const missing = KNOWN.filter(k => !list.some(d => d.info.rdns === k.rdns || d.info.name === k.name))
  return (
    <Modal title="Connect" placement="center" className="ly-flow-dialog ly-connect-dialog" busy={busy !== null}>
      <div className="bb-flow-wallets">
        {list.map((d) => (
          <button key={d.info.uuid} type="button" className={'bb-flow-wallet' + (busy === d.info.uuid ? ' on' : '')} aria-busy={busy === d.info.uuid || undefined} disabled={connecting || (busy !== null && busy !== d.info.uuid)} onClick={() => void pick(d)}>
            {d.info.icon ? <img src={d.info.icon} alt="" /> : <span className="ic" aria-hidden>{d.info.name.slice(0, 1)}</span>}
            <span className="n"><span>{d.info.name}</span></span>
            <span className="st">{busy === d.info.uuid && <i className="bb-spin" aria-hidden />}Detected</span>
          </button>
        ))}
        {missing.map(k => (
          <a key={k.rdns} className="bb-flow-wallet" href={k.url} target="_blank" rel="noreferrer">
            <img src={k.icon} alt="" />
            <span className="n"><span>{k.name}</span></span>
            <span className="st">Not installed</span>
          </a>
        ))}
        <Tooltip content="Coming soon" className="ly-wc-tip"><button type="button" className="bb-flow-wallet off" tabIndex={-1} aria-disabled="true" onClick={(e) => e.preventDefault()}>
          <img src={walletConnectIcon} alt="" /><span className="n"><span>WalletConnect</span></span>
        </button></Tooltip>
        {devBurner() && <button type="button" className="bb-flow-wallet burner" disabled={busy !== null} onClick={() => {
          try { const a = connectBurner(); toast('success', 'Wallet connected', shortAddr(a)); afterConnect(a) }
          catch (e) { toast('error', 'Wallet connection failed', errMsg(e)) }
        }}>
          <span className="ic" aria-hidden><BbIcon n="wallet" s={16} /></span>
          <span className="n"><span>Burner wallet</span></span>
        </button>}
      </div>
    </Modal>
  )
}

function SessionModal() {
  const { address } = useTrader()
  const [busy, setBusy] = useState(false)
  const registering = useStore(pendingStore).entries.some(e => e.action === 'RegisterSession')
  const gasless = !!useStore(configStore, s => s.cfg.raw?.features.gaslessSessions)
  if (!address) return <Modal title="One-click trading" placement="center" className="ly-flow-dialog"><NeedWallet what="turn on one-click trading" /></Modal>
  return (
    <Modal title="One-click trading" placement="center" className="ly-flow-dialog" busy={busy}>
      <div className="ly-flow-copy">
        <p>{gasless ? 'Sign once in your wallet (no gas)' : 'Confirm once in your wallet'} to trade without a popup on every order. Stays on for {sessionDays()} days.</p>
      </div>
      <p className="bb-flow-note warn">Only use this on a browser you trust.</p>
      <div className="bb-flow-acts">
        <Button variant="primary" size="lg" loading={busy || registering} onClick={async () => {
          setBusy(true)
          const ok = await withSignToast(gasless ? 'Sign in your wallet' : 'Confirm in your wallet', 'Turn on one-click trading', () => enableTrading())
          setBusy(false)
          if (ok) closeModal()
        }}>Turn on</Button>
      </div>
    </Modal>
  )
}

/** Validation reads in the submit button (amount-state.ts); the field only marks itself invalid. */
function AmountField({ id, label, value, setValue, chips, unit, invalid }: { id: string; label: string; value: string; setValue: (v: string) => void; chips: [string, () => void, boolean?][]; unit: string; invalid?: boolean }) {
  return (
    <Field label={label} htmlFor={id}>
      <InputShell state={invalid ? 'error' : 'default'} onMouseDown={focusBoxInput} trailing={unit}
        leading={<span className="ly-chips" role="group" aria-label="Quick amount">{chips.map(([l, f, dis]) => <Chip key={l} disabled={dis} onClick={f}>{l}</Chip>)}</span>}>
        <input id={id} inputMode="decimal" placeholder="0.00" value={value} aria-invalid={invalid || undefined} onChange={(e) => setValue(e.target.value.replace(/[^\d.]/g, ''))} />
      </InputShell>
    </Field>
  )
}

function DepositModal() {
  const { address, account, accountLoading } = useTrader()
  const [amt, setAmt] = useState('')
  const [busy, setBusy] = useState<'faucet' | 'deposit' | null>(null)
  const [chainBal, setChainBal] = useState<bigint | null>(null)
  const [balanceChecked, setBalanceChecked] = useState(false)
  const [balanceRetry, setBalanceRetry] = useState(0)
  useStore(configStore, (s) => s.cfg)
  const unconfirmed = useStore(pendingStore, (s) => hasUnconfirmedDeposit(s.entries))
  const stuck = useStore(pendingStore, (s) => dismissableDeposit(s.entries))
  useEffect(() => {
    let alive = true
    setChainBal(null)
    setBalanceChecked(false)
    if (address) void readCollateralBalance(address).then(b => { if (alive) { setChainBal(b); setBalanceChecked(true) } })
    return () => { alive = false }
  }, [address, account?.usdcWallet, balanceRetry])
  // Money moves in a centered dialog over a light scrim, so the price behind it stays readable.
  if (!address) return <Modal title="Deposit" placement="center" className="ly-flow-dialog"><NeedWallet what="deposit collateral" /></Modal>
  const dec = unitsOf().collateral, c = v1()
  const walRaw = chainBal, balanceKnown = walRaw !== null
  const wal = walRaw === null ? 0 : usd(walRaw)
  const minDeposit = BigInt(c.params.minDeposit)
  const st = amountState({ text: amt, dp: dec, symbol: coll(), action: 'Deposit', available: walRaw, min: minDeposit, busy: busy === 'deposit', blocked: unconfirmed ? 'Previous deposit pending' : undefined })
  const raw = st.raw, valid = !st.disabled
  const n = raw === null ? 0 : usd(raw)
  const half = walRaw === null ? '' : formatRaw(walRaw / 2n, dec, 2)
  return (
    <Modal title="Deposit" placement="center" className="ly-flow-dialog" busy={busy === 'deposit'}>
      <div className="bb-flow-move">
        <span><small>From wallet</small><b className="ui-num">{balanceKnown ? num(wal) : DASH} <i>{coll()}</i></b></span>
        <BbIcon n="next" s={24} className="ar" />
        <span className="r"><small>Trading balance</small><b className="ui-num">{account?.balance == null ? (accountLoading ? <Skeleton h=".9em" /> : DASH) : fmtUsd(account.balance + (valid ? n : 0))}</b></span>
      </div>
      {!balanceKnown && <DataNotice error={balanceChecked ? 'Wallet balance unavailable' : undefined} loading={!balanceChecked} label="wallet collateral balance" onRetry={() => setBalanceRetry(n => n + 1)} />}
      <AmountField id="dep-amt" label="Amount" value={amt} setValue={setAmt} unit={coll()} invalid={st.invalid}
        chips={[['1/2 ×', () => setAmt(half), !balanceKnown || wal <= 0], ['Max', () => setAmt(walRaw === null ? '' : formatRaw(walRaw, dec, 2)), !balanceKnown || wal <= 0]]} />
      <Button variant="primary" size="lg" block loading={busy === 'deposit'} disabled={st.disabled || busy !== null} title={unconfirmed ? 'Wait until the previous deposit resolves (see in-flight actions)' : undefined} onClick={async () => {
        setBusy('deposit')
        const ok = await withSignToast('Confirm in your wallet', `Deposit ${num(n)} ${coll()}`, () => deposit(amt))
        setBusy(null)
        if (ok) { setAmt(''); closeModal() }
      }}>{st.label}</Button>
      {unconfirmed && <p className="bb-note warn" role="status">Finishing your last deposit…{stuck && <> <button type="button" className="bb-link" onClick={() => dismissUnconfirmedDeposit(stuck.id)}>Dismiss</button></>}</p>}
      {c.features.faucet && c.faucet && <div className="bb-flow-faucet">
        <span>Empty wallet?</span>
        <Button size="sm" loading={busy === 'faucet'} disabled={busy !== null} onClick={async () => {
          setBusy('faucet')
          await faucet()
          setBusy(null)
          setBalanceRetry(n => n + 1)
        }}>{`Faucet · ${num(usd(c.faucet.amount))} test ${sym().collateral}`}</Button>
      </div>}
    </Modal>
  )
}

function WithdrawModal() {
  const { address, account, loaded, accountError } = useTrader()
  const [amt, setAmt] = useState('')
  const [busy, setBusy] = useState(false)
  if (!address) return <Modal title="Withdraw" placement="center" className="ly-flow-dialog"><NeedWallet what="withdraw collateral" /></Modal>
  if (!loaded || !account || account.availableRaw === null) return <Modal title="Withdraw" placement="center" className="ly-flow-dialog"><DataNotice error={accountError || undefined} loading={!accountError} label="withdrawal account" onRetry={() => void refreshAccount()} /></Modal>
  const dec = unitsOf().collateral, availRaw = account.availableRaw, avail = usd(availRaw), minWithdraw = BigInt(v1().params.minWithdraw)
  // The vault accepts a smaller amount only when it empties the available balance.
  const st = amountState({ text: amt, dp: dec, symbol: coll(), action: 'Withdraw', available: availRaw, min: minWithdraw, minOk: r => r === availRaw, busy })
  const raw = st.raw, valid = !st.disabled
  return (
    <Modal title="Withdraw" placement="center" className="ly-flow-dialog" busy={busy}>
      <AmountField id="wd-amt" label="Amount" value={amt} setValue={setAmt} unit={coll()} invalid={st.invalid}
        chips={[['1/2 ×', () => setAmt(formatRaw(availRaw / 2n, dec)), avail <= 0], ['Max', () => setAmt(formatRaw(availRaw, dec)), avail <= 0]]} />
      <dl className="ly-flow-rows">
        <div><dt>Available to withdraw</dt><dd className="ui-num">{num(avail)} {coll()}</dd></div>
        <div title={`Connected wallet · ${cfg().chainName}`}><dt>Destination</dt><dd className="ly-flow-dest"><span>{shortAddr(address)}</span><span className="ui-sr-only">connected wallet · {cfg().chainName}</span><CopyBtn text={address} label="Copy address" /></dd></div>
        <div><dt>Fees</dt><dd>None</dd></div>
      </dl>
      <Button variant="primary" size="lg" block loading={busy} disabled={st.disabled} onClick={async () => {
        setBusy(true)
        const ok = await withSignToast('Confirm in your wallet', `Withdraw ${exactAmount(raw!, dec, coll())}`, () => withdraw(amt))
        setBusy(false)
        if (ok) { setAmt(''); closeModal() }
      }}>{st.label}</Button>
    </Modal>
  )
}

function UsernameModal() {
  const { address, account } = useTrader()
  const [name, setName] = useState(account?.username || '')
  const [busy, setBusy] = useState(false)
  if (!address) return <Modal title="Claim a username" narrow><NeedWallet what="claim a username" /></Modal>
  const ok = USERNAME_RE.test(name)
  return (
    <Modal title="Claim a username" narrow busy={busy}>
      <p className="bb-flow-lead">Shown instead of your address. 3–20 letters, numbers or _.</p>
      <Field label="Username" htmlFor="un-name">
        <InputShell className="ly-text-input"><input id="un-name" placeholder="your name" maxLength={20} value={name} onChange={(e) => setName(e.target.value)} /></InputShell>
      </Field>
      <Button variant="primary" size="lg" block loading={busy} disabled={!ok || busy} onClick={async () => {
        setBusy(true)
        const r = await claimUsername(name.trim())
        setBusy(false)
        if (r) closeModal()
      }}>Claim</Button>
    </Modal>
  )
}

/** `?ref=<code>`: confirm before storing the referrer wallet (sent as extraData with opens/closes until bound on-chain). */
function ReferralModal() {
  const { pending, invites } = useStore(referralStore)
  const { address } = useTrader()
  const invite = inviteFor(invites, address ?? null)
  const bps = useStore(configStore).cfg.referral?.refereeBps
  const [wallet, setWallet] = useState<string | null | undefined>(undefined)
  useEffect(() => {
    let alive = true
    setWallet(undefined)
    if (pending) void resolveReferralCode(pending).catch(() => null).then((w) => { if (alive) setWallet(w) })
    return () => { alive = false }
  }, [pending])
  const close = () => { dismissReferral(); closeModal() }
  if (!pending) return null
  const self = !!wallet && !!address && wallet.toLowerCase() === address.toLowerCase()
  return (
    <Modal title="Join with an invite" narrow onClose={close}>
      <p className="bb-flow-lead">You opened an invite link with code <b className="mono">{pending}</b>. Accepting links your wallet to the referrer with your first trade. It is set once on-chain and never changes your price, fees or payouts.</p>
      <div className="bb-flow-sum">
        <div><span>Code</span><span className="mono">{pending}</span></div>
        <div><span>Referrer</span><span className="mono">{wallet === undefined ? 'Checking…' : wallet ? shortAddr(wallet, 8, 6) : 'Unknown code'}</span></div>
        <div><span>Bonus</span><span>{bps ? `Extra ${sym().token}: ${bps / 100}% of your losses` : `Extra ${sym().token} on losses`}</span></div>
      </div>
      {invite && invite.code !== pending && <p className="bb-flow-note">This replaces the stored invite <span className="mono">{invite.code}</span> (only used while your wallet has no referrer).</p>}
      {self && <p className="bb-flow-note warn">This is your own code; it cannot be used for your own wallet.</p>}
      {wallet === null && <p className="bb-flow-note warn">This invite code was not found. Check the link with whoever shared it; you can trade without one.</p>}
      <div className="bb-flow-acts">
        <Button size="lg" onClick={close}>No thanks</Button>
        <Button variant="primary" size="lg" disabled={!wallet || self} onClick={() => { if (acceptReferral(pending, wallet!, address ?? null)) { closeModal(); toast('success', 'Invite accepted') } else toast('error', 'Invite not saved', 'Please try again.') }}>Accept invite</Button>
      </div>
    </Modal>
  )
}

/** How trades are signed, plus the rare session tools; on-chain revoke sends a gateway transaction. */
function AdvancedModal() {
  const { address, account, sessionReady } = useTrader()
  const [busy, setBusy] = useState(false)
  useStore(executionStore)
  if (!address) return <Modal title="Trading" narrow><NeedWallet what="use these tools" /></Modal>
  const session = loadSession(address)
  const days = session ? sessionDaysRemaining(session.expiry, account?.chainTimestamp) : null
  const onChain = !!account?.sessionKey
  const mode = executionMode()
  return (
    // Every action here ends something, so the panel takes focus, not the first button.
    <Modal title="Trading" narrow busy={busy} focusDialog>
      {walletExecutionAvailable() && <section className="bb-adv" aria-label="Trade with">
        <div className="bb-adv-h"><b>Trade with</b>
          <Segmented label="Trade with" size="sm" value={mode} onChange={setExecutionMode} options={[{ value: 'wallet', label: 'Wallet' }, { value: 'session', label: 'Session key' }]} />
        </div>
        {mode === 'wallet'
          ? <small className="bb-adv-desc">Confirm each trade in your wallet · pay gas</small>
          : !sessionReady && <div className="bb-adv-row"><span><b>Not enabled</b><small>Sign once to trade from this browser.</small></span><Button size="sm" onClick={() => openModal('session')}>Enable · sign once</Button></div>}
      </section>}
      {(sessionReady || onChain) && <section className="bb-adv" aria-label="Session key">
        <div className="bb-adv-h"><b>Session key</b>{sessionReady
          ? <span className="bb-tag pos">{days === null ? 'Active' : `Active · ${days}d left`}</span>
          : <span className="bb-tag">Not in this browser</span>}</div>
        {sessionReady && <div className="bb-adv-row">
          <span><b>Forget in this browser</b><small>No gas. Trading here needs a new key.</small></span>
          <Button size="sm" disabled={busy} onClick={() => { clearSession(address); toast('info', 'One-click trading off'); closeModal() }}>Forget</Button>
        </div>}
        {onChain && <div className="bb-adv-row">
          <span><b>Revoke on-chain</b><small>Disables it everywhere and switches you to wallet. Pay gas.</small></span>
          <Button size="sm" variant="danger" disabled={busy} onClick={async () => { setBusy(true); try { if (await revokeTradingSession()) closeModal() } finally { setBusy(false) } }}>Revoke</Button>
        </div>}
      </section>}
      {!sessionReady && !onChain && !(walletExecutionAvailable() && mode === 'session') && <small className="bb-adv-desc">Nothing to turn off.</small>}
    </Modal>
  )
}

export function ModalHost() {
  const { modal } = useStore(uiStore)
  switch (modal) {
    case 'connect':
      return <ConnectModal />
    case 'deposit':
      return <DepositModal />
    case 'withdraw':
      return <WithdrawModal />
    case 'session':
      return <SessionModal />
    case 'username':
      return <UsernameModal />
    case 'referral':
      return <ReferralModal />
    case 'advanced':
      return <AdvancedModal />
    default:
      return null
  }
}

const TOAST_ICON: Record<string, BbIconName> = { success: 'check', error: 'info', warning: 'info', info: 'info' }
const toastText = (t: Toast) => `${t.title}${t.message ? '. ' + t.message : ''}`
/** Live-region text: a toast is announced when it appears or changes, never again when a newer one leaves. */
function useToastAnnouncements(toasts: Toast[]) {
  const seen = useRef(new Map<number, string>())
  const said = useRef({ polite: '', assertive: '' })
  const next = new Map<number, string>()
  for (const t of toasts) {
    const text = toastText(t)
    next.set(t.id, text)
    if (seen.current.get(t.id) !== text) said.current = { ...said.current, [t.kind === 'error' ? 'assertive' : 'polite']: text }
  }
  seen.current = next
  return said.current
}
/** Top-right under the header on desktop, top of the screen on mobile. Success drains (auto-hide); pending and errors stay. */
export function Toaster() {
  const { toasts } = useStore(toastStore)
  const said = useToastAnnouncements(toasts)
  return (
    <>
    <div className="ui-sr-only" aria-live="polite">{said.polite}</div>
    <div className="ui-sr-only" aria-live="assertive">{said.assertive}</div>
    <div className="toaster bb-toaster">
      {toasts.map((t) => (
        <div key={t.id} className={'bb-toast ' + t.kind}>
          <div className="h">
            {t.kind === 'pending' ? <i className="bb-spin" aria-hidden /> : <span className="ic"><BbIcon n={TOAST_ICON[t.kind] ?? 'info'} s={15} /></span>}
            <b>{t.title}</b>
            <button type="button" onClick={() => dismissToast(t.id)} aria-label="Dismiss"><BbIcon n="close" s={12} /></button>
          </div>
          {t.message && <p title={t.message}>{t.message}</p>}
          {(t.link || t.action) && <span className="acts">
            {t.action && <button type="button" onClick={() => { t.action!.onClick(); dismissToast(t.id) }}>{t.action.label}</button>}
            {t.link && <a href={t.link.href} target="_blank" rel="noreferrer">{t.link.label}</a>}
          </span>}
          {t.ttl > 0 && <span className="drain" aria-hidden><i style={{ animationDuration: t.ttl + 'ms' }} /></span>}
        </div>
      ))}
    </div>
    </>
  )
}
