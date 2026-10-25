import type { ReactNode } from 'react'
import { Caret, DataNotice, EmptyState, Menu } from '../primitives'
import { spanLabel } from '../../lib/format'

/** Chart frame: one first row with the title, its legend (or single live value) and the filters, then the plot. */
export function ChartCard<R extends string>({ label, value, range, ranges, onRange, picker, legend, level = 3, className, children }: {
  label: string
  /** A single-series chart's live value, shown beside the title. */
  value?: ReactNode
  /** Omitted: no range control (a chart that is not a time series). */
  range?: R
  ranges?: readonly R[]
  onRange?: (r: R) => void
  /** Several metrics in one card: the label becomes a menu of them. */
  picker?: { items: { key: string; label: string }[]; value: string; onChange: (key: string) => void }
  /** Beside the title: the lines of a multi-line chart with their live values (they toggle the lines). */
  legend?: ReactNode
  level?: 2 | 3
  className?: string
  children: ReactNode
}) {
  const rangeLabel = range
  const Heading = level === 2 ? 'h2' : 'h3'
  return (
    <section className={'ui-chart' + (className ? ' ' + className : '')}>
      <div className="ui-chart-head">
        <div className="ui-chart-tag">
            {picker
              ? <Menu label="Chart metric" align="start" triggerClassName="ui-chart-label ui-chart-pick" trigger={<><span className="ui-sr-only">Chart </span>{label}</>}
                  items={picker.items.map((m) => ({ key: m.key, label: m.label, selected: m.key === picker.value, onSelect: () => picker.onChange(m.key) }))} />
              : <Heading className="ui-chart-label">{label}</Heading>}
          </div>
        {legend ?? (value != null && <span className="ui-chart-value ui-num">{value}</span>)}
        {range !== undefined && (onRange && ranges ? (
          <Menu
            label={`${label} range`}
            align="end"
            triggerClassName="ui-chart-range"
            trigger={<><span className="ui-sr-only">{label} range </span>{spanLabel(rangeLabel ?? '')}</>}
            items={ranges.map((r) => ({ key: r, label: spanLabel(r), selected: r === range, onSelect: () => onRange(r) }))}
          />
        ) : (
          <button type="button" className="ui-chart-range" disabled title="History not available yet">
            {spanLabel(rangeLabel ?? '')}
            <Caret />
          </button>
        ))}
      </div>
      <div className="ui-chart-body">{children}</div>
    </section>
  )
}

/** Chart body states: read failure or first load, then empty range, then the chart. */
export function ChartState({ data, error, loading, label, onRetry, empty, emptyText, children }: {
  data: unknown[] | undefined
  error?: string
  loading: boolean
  label: string
  onRetry: () => void
  empty?: boolean
  emptyText?: string
  children: () => ReactNode
}) {
  if (error || !data) return <div className="ui-chart-state"><DataNotice shape="chart" error={error} loading={loading || !error} label={label} onRetry={onRetry} /></div>
  if (empty ?? !data.length) return <div className="ui-chart-state"><EmptyState size="sm" icon="stats">{emptyText ?? `No ${label} in this range.`}</EmptyState></div>
  return <>{children()}</>
}
