import { useState } from 'react'
import { claimEveryone } from '../lib/actions'
import { configStore } from '../lib/config'
import { getGlobalRewards, globalRewardsActionable } from '../lib/global-rewards'
import { useApi, useNow, useTrader } from '../lib/hooks'
import { useStore } from '../lib/store'
import { Button, DataNotice, Tooltip } from './primitives'

/** Permissionless RewardBatcher round (GET /v1/staking); the keeper runs it, any wallet may push a page (pays gas). */
export function GlobalRewardsClaim() {
  const { cfg } = useStore(configStore)
  const { address } = useTrader()
  const [busy, setBusy] = useState(false)
  const now = useNow(1000)
  const capable = !!cfg.addresses.rewardBatcher
  const { data, error, loading, reload } = useApi(capable ? `global-rewards:${cfg.scope}` : null, async () => ({ state: await getGlobalRewards(), receivedAt: Date.now() }), 5000)
  const state = data?.state
  // A stored eligible result must not remain actionable after its refresh fails.
  const actionable = !!state && !error && now - (data?.receivedAt || 0) < 15000 && globalRewardsActionable(state)
  if (!capable) return null
  const btn = address ? <Button variant="tertiary" size="sm" loading={busy} disabled={busy || !actionable} onClick={async () => {
    setBusy(true)
    try { await claimEveryone() } finally { reload(); setBusy(false) }
  }}>Start reward round</Button> : <Button variant="tertiary" size="sm" disabled>Start reward round</Button>
  return <div className="ck-global" role="group" aria-label="Reward round">
    <Tooltip content="Pays this round's rewards to all stakers. You pay the gas.">{btn}</Tooltip>
    {state?.active && <span className="ck-global-status" role="status">Reward round in progress</span>}
    <DataNotice error={error} loading={!state && loading} label="global reward eligibility" onRetry={reload} />
  </div>
}
