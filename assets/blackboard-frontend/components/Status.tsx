import { backendStore } from '../lib/api'
import { configStore } from '../lib/config'
import { getHistory, getHouse, getStatus, HOUSE_KEY, queueFrontIndex, queueKey } from '../lib/data'
import { DASH, fmtNum, fmtUsd, timeAgo } from '../lib/format'
import { queuePlace } from '../lib/presentation'
import { useApi, useTrader } from '../lib/hooks'
import { hlWsStore } from '../lib/hlws'
import { wsStore } from '../lib/prices'
import { useStore } from '../lib/store'
import type { QueueRow } from '../lib/types'
import { DataNotice, EmptyState, TableCell, TableHeaderCell } from './primitives'

type Block = { number: number; gasUsed: number; gasLimit: number; baseFee: number | null; txs: number }
const hex = (v: string | null | undefined) => (v ? parseInt(v, 16) : 0)

/** Last few blocks straight from the chain RPC: fill, gas and base fee. */
async function recentBlocks(rpc: string, n = 6): Promise<Block[]> {
  const call = async (body: unknown) => (await (await fetch(rpc, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })).json())
  const head = hex((await call({ jsonrpc: '2.0', id: 0, method: 'eth_blockNumber', params: [] })).result)
  const nums = Array.from({ length: Math.min(n, head + 1) }, (_, i) => head - (Math.min(n, head + 1) - 1) + i)
  const rows = await call(nums.map((k, i) => ({ jsonrpc: '2.0', id: i + 1, method: 'eth_getBlockByNumber', params: ['0x' + k.toString(16), false] })))
  return (rows as { id: number; result?: { number: string; gasUsed: string; gasLimit: string; baseFeePerGas?: string; transactions: unknown[] } }[])
    .sort((x, y) => x.id - y.id).flatMap(r => r.result ? [{ number: hex(r.result.number), gasUsed: hex(r.result.gasUsed), gasLimit: hex(r.result.gasLimit), baseFee: r.result.baseFeePerGas ? hex(r.result.baseFeePerGas) : null, txs: r.result.transactions.length }] : [])
}

const gasM = (g: number) => (g ? `${fmtNum(g / 1e6, 2)}M gas` : 'empty')
const gwei = (w: number | null) => (w === null ? DASH : `${fmtNum(w / 1e9, 3)} gwei`)

/** Congestion summary plus the recent block fills, like a mempool strip. */
function BlocksStrip() {
  const { cfg: c } = useStore(configStore)
  const { data: st } = useApi('status', getStatus, 5000)
  const { data: blocks, error, loading, reload } = useApi(c.rpcUrl ? 'status:blocks:' + c.rpcUrl : null, () => recentBlocks(c.rpcUrl), 3000, { keepPrevious: true })
  const intents = st && 'queued' in st.intents ? st.intents : null
  const fill = (b: Block) => (b.gasLimit ? (b.gasUsed / b.gasLimit) * 100 : 0)
  const avgFill = blocks?.length ? blocks.reduce((t, b) => t + fill(b), 0) / blocks.length : null
  const avgTx = blocks?.length ? blocks.reduce((t, b) => t + b.txs, 0) / blocks.length : null
  const pending = intents ? intents.queued + intents.inFlight : null
  const congestion = avgFill === null ? DASH : avgFill > 70 ? 'High' : avgFill > 35 ? 'Medium' : 'Low'
  const blockSec = 1 // Robinhood Chain and the local stack seal a block per second
  const clear = pending === null ? DASH : pending === 0 ? '0s' : `~${Math.ceil(pending / Math.max(1, avgTx ?? 1)) * blockSec}s`
  return <div className="tr-blocks" aria-label="Chain blocks">
    <div className="tr-blocks-sum">
      <div><span>Congestion</span><b className={avgFill !== null && avgFill > 70 ? 'ui-down' : avgFill !== null && avgFill > 35 ? 'ui-warn' : 'ui-up'}>{congestion}</b></div>
      <div><span>Pending tx</span><b className="ui-num">{pending ?? DASH}</b></div>
      <div><span>Avg tx/block</span><b className="ui-num">{avgTx === null ? DASH : fmtNum(avgTx, 1)}</b></div>
      <div><span>Time to clear</span><b className="ui-num">{clear}</b></div>
    </div>
    {!blocks ? <DataNotice shape="cards" error={error} loading={loading} label="chain blocks" onRetry={reload} />
      : <ol className="tr-blocks-list">{blocks.map((b, i) => <li key={b.number} className={i === blocks.length - 1 ? 'is-head' : undefined}>
          <div className="tr-block-top"><span>{i === blocks.length - 1 ? 'Latest' : 'Mined'}</span><b className="ui-num">{fmtNum(fill(b), 2)}%</b></div>
          <div className="tr-block-bar" aria-hidden><i style={{ width: `${Math.min(100, fill(b))}%` }} /></div>
          <div className="tr-block-foot ui-num"><span>#{fmtNum(b.number, 0)} / {gasM(b.gasUsed)}</span><span>{gwei(b.baseFee)}</span></div>
        </li>)}</ol>}
  </div>
}

const LANE_LABEL: Record<string, string> = { executor: 'Executor', liquidator: 'Liquidator', keeper: 'Keeper' }
const dot = (tone: '' | ' is-warn' | ' is-bad') => <span className={'tr-okdot' + tone} />

/** What is live right now: backend, the price stream, indexer, queue and signer lanes. No addresses. */
function SystemStatus() {
  const { data: st, error, loading, reload } = useApi('status', getStatus, 5000)
  const { connected: hlConnected } = useStore(hlWsStore)
  const { connected } = useStore(wsStore)
  const { up } = useStore(backendStore)
  const lanes = st && Array.isArray(st.lanes) ? st.lanes : []
  // Lane workers are named after their signer address; the lane rows below already cover them.
  const roles = st && Array.isArray(st.roles) ? st.roles.filter(r => !r.name.startsWith('lane:')) : []
  const laneNo: Record<string, number> = {}
  const intents = st && 'queued' in st.intents ? st.intents : null
  const lag = st?.indexer.lagBlocks ?? null
  const kv: [string, React.ReactNode][] = [
    ['Backend', <>{dot(up ? '' : ' is-bad')}{up ? 'Online' : 'Offline'}</>],
    ['Price stream (Hyperliquid)', <>{dot(hlConnected ? '' : ' is-warn')}{hlConnected ? 'Connected' : 'Reconnecting · backup prices from the API'}</>],
    ['Live stream (WS)', <>{dot(connected ? '' : ' is-warn')}{connected ? 'Connected' : 'Reconnecting · REST fallback'}</>],
    ['Indexer', st ? <>{dot(!st.indexer.ready ? ' is-bad' : (lag ?? 0) > 5 ? ' is-warn' : '')}{st.indexer.ready ? `Synced · ${Math.max(0, lag ?? 0)} blocks behind` : 'Not ready · ' + st.indexer.reason}</> : DASH],
    ['Intent queue', intents ? <>{dot(intents.oldestQueuedAgeMs !== null && intents.oldestQueuedAgeMs > 30000 ? ' is-warn' : '')}{intents.queued} queued · {intents.inFlight} in flight{intents.oldestQueuedAgeMs !== null ? ` · oldest ${(intents.oldestQueuedAgeMs / 1000).toFixed(0)}s` : ''}</> : DASH],
    ...roles.map((r): [string, React.ReactNode] => [`${r.name} worker`, <>{dot(r.alive ? '' : ' is-bad')}{r.alive ? 'Running' : 'Down'} · heartbeat {(r.heartbeatAgeMs / 1000).toFixed(0)}s</>]),
    ...lanes.map((l): [string, React.ReactNode] => [`${LANE_LABEL[l.role ?? ''] ?? 'Signer'} lane ${(laneNo[l.role ?? ''] = (laneNo[l.role ?? ''] ?? 0) + 1)}`, <>{dot(l.stuck ? ' is-bad' : l.pendingNonces > 3 ? ' is-warn' : '')}{l.stuck ? 'Stuck' : 'OK'} · {l.pendingNonces} pending</>]),
  ]
  return (
    <><DataNotice error={error || (st?.ok === false ? 'Execution service unhealthy' : undefined)} loading={!st && loading} shape="cards" label="system status" onRetry={reload} /><div className="tr-sys-kv">
      {kv.map(([k, v], i) => (
        <div key={k + i}>
          <div className="k">{k}</div>
          <div className="v">{v}</div>
        </div>
      ))}
    </div></>
  )
}

const queueCols = (front: string | null | undefined): [string, (r: QueueRow) => React.ReactNode, boolean?][] => [
  ['Entry #', (r) => r.index], ['Position', (r) => '#' + r.positionId], ['Amount', (r) => fmtUsd(r.amount)], ['Remaining', (r) => fmtUsd(r.remaining)],
  ['Place in queue', (r) => { const n = queuePlace(r.index, front); return n === null ? DASH : fmtNum(n, 0) }], ['Ahead of you', (r) => fmtUsd(r.aheadUsd)], ['Queued', (r) => timeAgo(r.createdAt), true],
]

export function StatusTab() {
  const { address } = useTrader()
  const { data, error, loading, reload } = useApi(address ? queueKey(address) : null, () => getHistory<QueueRow>(address!, 'queue', 1, 50), 5000)
  const house = useApi(address ? HOUSE_KEY : null, getHouse, 15000), front = queueFrontIndex(house.data)
  const cols = queueCols(front)
  return (
    <div className="tr-status">
      <BlocksStrip />
      <section className="tr-sys" aria-labelledby="queue-title">
        <div className="tr-sys-h" id="queue-title">Your pending queue <span className="ui-num">{data ? data.rows.length : DASH}</span></div>
        {address && !data ? <DataNotice shape="table" error={error} loading={loading} label="your queue" onRetry={reload} /> : address ? (
          data!.rows.length ? <div className="bb-scroll-x tr-table-wrap"><table className="ui-table tr-table">
            <thead><tr>{cols.map(([l, , r]) => <TableHeaderCell key={l} align={r ? 'right' : 'left'}>{l}</TableHeaderCell>)}</tr></thead>
            <tbody>{data!.rows.map((row) => <tr key={row.index}>{cols.map(([l, f, r]) => <TableCell key={l} align={r ? 'right' : 'left'}>{f(row)}</TableCell>)}</tr>)}</tbody>
          </table></div> : <EmptyState icon="queue" size="sm" className="tr-sys-pad">Nothing waiting to be paid out.</EmptyState>
        ) : (
          <EmptyState icon="wallet" size="sm" className="tr-sys-pad">Connect wallet to view your pending queue.</EmptyState>
        )}
      </section>
      <section className="tr-sys" aria-labelledby="system-title">
        <div className="tr-sys-h" id="system-title">System status</div>
        <SystemStatus />
      </section>
    </div>
  )
}
