import { useState } from 'react'
import { checkAll, pendingStore } from '../lib/pending'
import { useStore } from '../lib/store'
import { Button } from './primitives'

/** Shown while a signed request's admission is unconfirmed (lost response), or when the local list cannot persist. */
export function PendingIntentBanner() {
  const { entries, storageError } = useStore(pendingStore)
  const [busy, setBusy] = useState(false)
  const uncertain = entries.filter(e => e.status === 'submitting' && e.error)
  if (!uncertain.length && !storageError) return null
  const first = uncertain[0]
  return <aside className="pending-intent-banner" role="status" aria-live="polite">
    <div className="pending-intent-copy">
      <b>{first ? `${first.title} · confirmation pending` : 'In-flight actions are not saved'}</b>
      <span>{storageError || 'The signed request may already be queued. Checking resends the exact same request; it never signs a new one.'}</span>
      {first?.error && <span className="pending-intent-detail">{first.error}{uncertain.length > 1 ? ` · ${uncertain.length - 1} more` : ''}</span>}
    </div>
    {first && <Button size="sm" loading={busy} onClick={async () => { setBusy(true); try { await checkAll() } finally { setBusy(false) } }}>Check now</Button>}
  </aside>
}
