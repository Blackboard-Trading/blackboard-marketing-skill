import { useMemo, useState, type ReactNode } from 'react'
import { useApi } from '../../lib/hooks'
import type { SeriesPoint } from '../../lib/types'
import { ChartCard, ChartState } from './ChartCard'
import { C, rgba } from './lw'
import { SeriesChart, type SeriesSpec } from './SeriesChart'

export const CHART_RANGES = ['1h', '1d', '7d', '30d', 'all'] as const
export type ChartRange = (typeof CHART_RANGES)[number]
/** Axis for counts (module level: a stable formatter keeps the chart from re-applying options). */
export const countAxis = (n: number) => fmtCount(n)
const fmtCount = (n: number) => Math.round(n).toLocaleString('en-US')

/** One metric over time with its own range: area (or steps for cumulative values), bars for per-period totals. */
export function MetricChart({ label, value, load, cacheKey, kind = 'area', fmt, className }: {
  label: string; value?: ReactNode; load: (r: ChartRange) => Promise<SeriesPoint[]>; cacheKey: string; kind?: 'area' | 'stepped' | 'bars'; fmt?: (n: number) => string; className?: string
}) {
  const [range, setRange] = useState<ChartRange>('1d')
  const { data, error, loading, reload } = useApi(`${cacheKey}:${range}`, () => load(range), 15000, { keepPrevious: true })
  const series = useMemo<SeriesSpec[]>(() => !data ? [] : kind === 'bars'
    ? [{ kind: 'histogram', data, color: C.pos, label: false, name: label }]
    : [{ kind: 'area', data, color: C.ink, fill: rgba(C.ink, 0.12), fill2: rgba(C.ink, 0.02), width: 2, stepped: kind === 'stepped', name: label }], [data, kind, label])
  return (
    <ChartCard className={className} label={label} value={value} range={range} ranges={CHART_RANGES} onRange={setRange}>
      <ChartState data={data} error={error} loading={loading} label={label.toLowerCase()} onRetry={reload} empty={kind === 'bars' ? !(data ?? []).some((p) => p.v) : undefined}>
        {() => <SeriesChart series={series} fmt={fmt} integer={fmt === countAxis} topMargin={0.12} range={range} />}
      </ChartState>
    </ChartCard>
  )
}
