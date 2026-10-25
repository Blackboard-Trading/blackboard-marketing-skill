import type { ReactNode } from 'react'
import { configStore } from '../lib/config'
import { useStore } from '../lib/store'
import { CoinIcon } from './Icons'
import { Menu } from './primitives'

/** Market picker over the markets in GET /v1/config, one table row per market under `header`. `quote`: Trade bar trigger with a live quote; `compact`: phone header. */
export function MarketMenu({ coin, onChange, variant = 'quote', quote, row, header }: {
  coin: string
  onChange: (c: string) => void
  variant?: 'quote' | 'compact'
  quote?: (c: string) => ReactNode
  row: (c: string) => ReactNode
  header?: ReactNode
}) {
  const { cfg } = useStore(configStore)
  const trigger = variant === 'compact' ? <span className="tr-quote"><CoinIcon coin={coin} size={18} /><b className="tr-quote-sym">{coin}-USD</b></span> : quote?.(coin)
  return (
    <Menu
      label="Switch market"
      align="start"
      className={'tr-mkt' + (variant === 'compact' ? ' tr-mkt--compact' : '')}
      triggerClassName="tr-mkt-trigger"
      trigger={trigger}
      header={header}
      items={cfg.markets.map(({ symbol: c }) => ({
        key: c,
        selected: c === coin,
        label: <span className="tr-mkt-opt">{row(c)}</span>,
        onSelect: () => onChange(c),
      }))}
    />
  )
}
