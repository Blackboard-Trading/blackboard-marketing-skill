import { accountStore, POSITION_PAGE_SIZE, positionPages, setPositionPage } from '../lib/account'
import { useStore } from '../lib/store'
import { PositionPageControls } from './PositionPageControls'

export function PositionsPager() {
  const s = useStore(accountStore)
  if (!s.address) return null
  return <PositionPageControls page={s.positionPage} pages={positionPages()} total={s.account?.positionsCount ?? s.positions.length} count={s.positions.length} pageSize={POSITION_PAGE_SIZE} loaded={s.loaded} onPage={setPositionPage} />
}
