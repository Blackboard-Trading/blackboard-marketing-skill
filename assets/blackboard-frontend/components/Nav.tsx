import { useCallback, useEffect, useRef, useState } from 'react'
import { useDisplayAccount } from './trade/live-positions'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { backendStore } from '../lib/api'
import { executionMode, executionStore, setExecutionMode, walletExecutionAvailable } from '../lib/execution'
import { revokeTradingSession } from '../lib/actions'
import { BRAND, tradePath } from '../lib/config'
import { DASH, fmtUsd, shortAddr } from '../lib/format'
import { useClickOutside, useTrader } from '../lib/hooks'
import { useStore } from '../lib/store'
import { openModal, toast } from '../lib/toast'
import { disconnectWallet } from '../lib/wallet'
import { useReferralAccess } from '../lib/referral'
import { referralMenu } from '../lib/referral-invite'
import { BbIcon, type BbIconName } from './BbIcon'
import { Button, Caret, DUR, Tooltip, useCopy, usePresence } from './primitives'

/** Notice under the header when the backend is down. */
function DataStrip() {
  const { up } = useStore(backendStore)
  if (up !== false) return null
  return (
    <div className="ly-datastrip-wrap">
      <div className="ly-datastrip bad" role="alert"><i aria-hidden />Data unavailable</div>
    </div>
  )
}

function Brand() {
  return <Link to="/" className="bb-brand" aria-label={`${BRAND} home`}>{BRAND}</Link>
}

const NAV: { to: string; label: string; match: (p: string) => boolean; icon: BbIconName; short: string }[] = [
  { to: '/trade', label: 'Trade', short: 'Trade', icon: 'trade', match: (p) => p.startsWith('/trade') },
  { to: '/portfolio', label: 'Portfolio', short: 'Portfolio', icon: 'portfolio', match: (p) => p.startsWith('/portfolio') },
  { to: '/protocol', label: 'Protocol', short: 'Protocol', icon: 'analytics', match: (p) => p.startsWith('/protocol') || p.startsWith('/house') },
  { to: '/chalk', label: '$CHALK', short: '$CHALK', icon: 'chalk', match: (p) => p.startsWith('/chalk') || p.startsWith('/staking') || p.startsWith('/redemption') },
  { to: '/leaderboard', label: 'Leaderboard', short: 'Leaderboard', icon: 'leaderboard', match: (p) => p.startsWith('/leaderboard') },
  { to: '/docs', label: 'Docs', short: 'Docs', icon: 'docs', match: (p) => p.startsWith('/docs') },
]
/** Wallet-menu entries for referral: the dashboard link for code owners, one invite line for referees. */
function ReferralBlock({ address, close }: { address: string; close: () => void }) {
  const { gate, info, invite } = useReferralAccess(address)
  const part = gate === 'loading' || gate === 'connect' ? null : referralMenu(info, invite)
  if (part === 'owner') return <Link className="ly-wm-item" to="/referral" onClick={close}><span>Referral code</span><b className="ly-wm-code">{info?.code}</b></Link>
  if (part !== 'referee') return null
  const linked = !!info?.referredBy
  const referrer = info?.referredBy ?? invite?.wallet ?? null
  const refCode = linked ? info?.referredByCode ?? null : invite?.code ?? null
  // Pending invite: the code is yellow until the first trade links it on-chain.
  return (
    <div className="ly-wm-item ly-wm-static" title={referrer ?? undefined}>
      <span>Invited by</span>
      {linked ? <b className="ly-wm-code is-linked">{refCode ?? shortAddr(referrer)}</b>
        : <Tooltip content="Make your first trade to complete the invite"><b className="ly-wm-code">{refCode ?? shortAddr(referrer)}</b></Tooltip>}
    </div>
  )
}

function WalletMenu({ close, exiting }: { close: () => void; exiting: boolean }) {
  const { address, sessionReady, account: acct, positions } = useTrader()
  const account = useDisplayAccount(acct, positions)
  const { copied, copy } = useCopy(1600)
  const [busy, setBusy] = useState(false)
  useStore(executionStore)
  if (!address) return null
  const go = (m: Parameters<typeof openModal>[0]) => { close(); openModal(m) }
  // One-click trading = a registered session key in use. Off: wallet mode when available (no gas), else revoke on-chain.
  const oneClick = sessionReady && executionMode() !== 'wallet'
  const toggle = async () => {
    if (!oneClick) {
      if (sessionReady) setExecutionMode('session')
      else go('session')
      return
    }
    if (walletExecutionAvailable()) { setExecutionMode('wallet'); return }
    setBusy(true)
    try { await revokeTradingSession() } finally { setBusy(false) }
  }
  return (
    <div id="ly-wallet-panel" tabIndex={-1} className={'bb-pop ly-wmenu ' + (exiting ? 'ui-anim-pop-out' : 'ui-anim-pop-in')} role="dialog" aria-label="Wallet">
      <div className="ly-wm-id">
        <span className="ly-wm-avatar ui-display" aria-hidden>{(account?.username || address.slice(2, 3)).slice(0, 1).toUpperCase()}</span>
        <span className="ly-wm-who">
          <b>{account?.username || shortAddr(address)}</b>
          {account?.username && <span className="ly-wm-addr" title={address}>{shortAddr(address)}</span>}
        </span>
        <button type="button" className="ly-wm-icon" data-copied={copied === 'addr' ? '' : undefined} onClick={() => copy(address, 'addr')} aria-label={copied === 'addr' ? 'Address copied' : 'Copy address'} title={copied === 'addr' ? undefined : 'Copy address'}><BbIcon n={copied === 'addr' ? 'check' : 'copy'} s={16} /></button>
        <button type="button" className="ly-wm-icon" onClick={() => go('username')} aria-label={account?.username ? 'Change username' : 'Claim a username'} title={account?.username ? 'Change username' : 'Claim a username'}><BbIcon n="edit" s={16} /></button>
      </div>
      <div className="ly-wm-bal">
        <span className="ly-wm-bal-k">Account equity</span>
        <b className="ly-wm-bal-v ui-display ui-num">{account?.equity != null ? fmtUsd(account.equity) : DASH}</b>
        <div className="ly-wm-bal-acts">
          <Button variant="primary" size="md" onClick={() => go('deposit')}>Deposit</Button>
          <Button size="md" onClick={() => go('withdraw')}>Withdraw</Button>
        </div>
      </div>
      <div className="ly-wm-item ly-wm-static"><span id="ly-oneclick">One-click trading</span><button type="button" className={'ly-switch' + (oneClick ? ' is-on' : '')} role="switch" aria-checked={oneClick} aria-labelledby="ly-oneclick" disabled={busy} onClick={() => void toggle()} /></div>
      <ReferralBlock address={address} close={close} />
      <button type="button" className="ly-wm-item ly-wm-out" onClick={() => {
        const forgot = disconnectWallet()
        close()
        requestAnimationFrame(() => document.querySelector<HTMLElement>('.ly-connect')?.focus())
        if (forgot) toast('info', 'Disconnected')
      }}><span>Disconnect</span><BbIcon n="signout" s={18} /></button>
    </div>
  )
}

export function Nav() {
  const loc = useLocation()
  const { address, account } = useTrader()
  const [open, setOpen] = useState(false)
  const presence = usePresence(open, DUR.fast)
  const ref = useRef<HTMLDivElement>(null)
  const close = useCallback(() => setOpen(false), [])
  useClickOutside(ref, close, open)
  useEffect(() => {
    if (!open) return
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') { setOpen(false); ref.current?.querySelector<HTMLButtonElement>('.bb-walletpill')?.focus() } }
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [open])
  useEffect(() => setOpen(false), [loc.pathname])
  const wasOpen = useRef(false)
  useEffect(() => {
    const pill = ref.current?.querySelector<HTMLButtonElement>('.bb-walletpill')
    const closing = wasOpen.current && !open
    wasOpen.current = open
    if (open) {
      const frame = requestAnimationFrame(() => ref.current?.querySelector<HTMLElement>('.ly-wmenu')?.focus())
      return () => cancelAnimationFrame(frame)
    }
    if (!closing) return
    const active = document.activeElement
    if (pill && (active === document.body || ref.current?.querySelector('.ly-wmenu')?.contains(active))) pill.focus()
  }, [open])
  const tradeTo = loc.pathname.startsWith('/trade') ? loc.pathname : tradePath()
  return (
    <>
      <header className="bb-header ly-header">
        <Brand />
        <nav className="ly-nav" aria-label="Main">
          {NAV.map((n) => {
            const on = n.match(loc.pathname)
            return <NavLink key={n.to} to={n.to === '/trade' ? tradeTo : n.to} className={'ly-navlink' + (on ? ' is-active' : '')} aria-current={on ? 'page' : undefined}>{n.label}</NavLink>
          })}
        </nav>
        <div className="ly-actions">
          {address && <button type="button" className="ly-deposit" aria-haspopup="dialog" aria-label="Deposit" title="Deposit" onClick={() => openModal('deposit')}><BbIcon n="deposit" s={18} /><span>Deposit</span></button>}
          {address ? (
            <div className="ly-wallet-wrap" ref={ref}>
              <span className="ly-divider" aria-hidden />
              <button type="button" className="bb-walletpill ly-wallet" onClick={() => setOpen((o) => !o)} aria-haspopup="dialog" aria-expanded={open} aria-controls={open ? 'ly-wallet-panel' : undefined} title="Wallet · trading, referral">
                <span>{account?.username || shortAddr(address)}</span>
                <Caret open={open} />
              </button>
              {presence && <WalletMenu close={close} exiting={presence === 'exit'} />}
            </div>
          ) : (
            <Button variant="secondary" className="ly-connect" onClick={() => openModal('connect')}>Connect wallet</Button>
          )}
        </div>
      </header>
      <DataStrip />
      <nav className="ly-tabbar" aria-label="Main">
        {NAV.filter((n) => n.to !== '/docs').map((n) => {
          const on = n.match(loc.pathname)
          return <NavLink key={n.to} to={n.to === '/trade' ? tradeTo : n.to} className={'ly-tab' + (on ? ' is-active' : '')} aria-current={on ? 'page' : undefined}><BbIcon n={n.icon} s={22} /><span>{n.short}</span></NavLink>
        })}
      </nav>
    </>
  )
}
