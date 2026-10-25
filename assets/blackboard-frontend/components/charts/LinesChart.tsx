import { useMemo, useState, type ReactNode } from 'react'
import type { SeriesPoint } from '../../lib/types'
import { ChartCard, ChartState } from './ChartCard'
import { SeriesChart, type SeriesSpec } from './SeriesChart'

export interface ChartLine {
  key: string
  label: string
  color: string
  data: SeriesPoint[] | undefined
  /** Live headline in the legend; `live` (a number) also ends the line, so the chart and the legend agree. */
  value: ReactNode
  live?: number | null
  stepped?: boolean
}

/** Several lines on one time axis with a legend: each entry shows its live value and toggles its line. */
export function LinesChart<R extends string>({ label, lines, range, ranges, onRange, error, loading, onRetry, fmt, picker, className }: {
  label: string
  lines: ChartLine[]
  range: R
  ranges: readonly R[]
  onRange: (r: R) => void
  error?: string
  loading: boolean
  onRetry: () => void
  fmt?: (n: number) => string
  picker?: Parameters<typeof ChartCard>[0]['picker']
  className?: string
}) {
  const [off, setOff] = useState<ReadonlySet<string>>(() => new Set())
  const toggle = (key: string) => setOff((prev) => {
    const next = new Set(prev)
    if (next.has(key)) next.delete(key)
    else if (next.size < lines.length - 1) next.add(key) // one line always stays
    return next
  })
  const series = useMemo<SeriesSpec[]>(() => lines.map((l) => {
    const pts = l.data ?? [], last = pts.at(-1)?.t ?? 0
    const data = l.live == null || !pts.length ? pts : [...pts, { t: Math.max(Date.now(), last + 1000), v: l.live }]
    return { kind: 'line', data, color: l.color, width: 2, stepped: l.stepped, hidden: off.has(l.key), name: l.label }
  }), [lines, off])
  const legend = <div className="ui-legend" role="group" aria-label={`${label} lines`}>
    {lines.map((l) => <button key={l.key} type="button" className="ui-legend-item" aria-pressed={!off.has(l.key)} onClick={() => toggle(l.key)}>
      <i style={{ background: l.color }} aria-hidden /><span>{l.label}</span><b className="ui-num">{l.value}</b>
    </button>)}
  </div>
  const data = lines.find((l) => l.data)?.data
  return (
    <ChartCard className={'ui-chart--lines' + (className ? ' ' + className : '')} label={label} picker={picker} legend={legend} range={range} ranges={ranges} onRange={onRange}>
      <ChartState data={data} error={error} loading={loading} label={`${label.toLowerCase()} history`} onRetry={onRetry}>
        {() => <SeriesChart series={series} fmt={fmt} topMargin={0.12} range={range} />}
      </ChartState>
    </ChartCard>
  )
}
