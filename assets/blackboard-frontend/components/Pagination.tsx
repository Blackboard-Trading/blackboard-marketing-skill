import { useState } from 'react'
import { BbIcon, IconButton, Menu } from './primitives'

export const PAGE_SIZES = [10, 25, 50, 100] as const

/** Rows-per-page choice, remembered under `key`. */
export function usePageSize(key: string, fallback: number = PAGE_SIZES[0]) {
  const [size, setSize] = useState<number>(() => { try { const n = Number(localStorage.getItem(key)); return PAGE_SIZES.includes(n as 10) ? n : fallback } catch { return fallback } })
  const set = (n: number) => { setSize(n); try { localStorage.setItem(key, String(n)) } catch { /* ignore */ } }
  return [size, set] as const
}

/** Cursor pages: previous / next. */
export function Pagination({ page, hasNext, total, size, setPage, setSize, rows }: { page: number; hasNext: boolean; total?: number; size: number; setPage: (p: number) => void; setSize: (n: number) => void; rows: number }) {
  if (page <= 1 && !hasNext && rows <= PAGE_SIZES[0]) return null
  const from = rows ? (page - 1) * size + 1 : 0, to = (page - 1) * size + rows
  return <PagerBar size={size} onSize={n => { setSize(n); setPage(1) }} from={from} to={to} total={total} canPrev={page > 1} canNext={hasNext} onPrev={() => setPage(page - 1)} onNext={() => setPage(page + 1)} />
}

/** Rows per page, range and previous / next under a table: small and quiet, so the rows stay the focus. */
export function PagerBar({ sizes = PAGE_SIZES, size, onSize, from, to, total, canPrev, canNext, onPrev, onNext }: { sizes?: readonly number[]; size: number; onSize: (n: number) => void; from: number; to: number; total?: number; canPrev: boolean; canNext: boolean; onPrev: () => void; onNext: () => void }) {
  return <div className="ui-pager">
    <span className="ui-pager-label" aria-hidden>Rows per page</span>
    <Menu label="Rows per page" align="end" triggerClassName="ui-pager-size" trigger={<><span className="ui-sr-only">Rows per page </span><span className="ui-num">{size}</span></>}
      items={sizes.map(n => ({ key: String(n), label: <span className="ui-num">{n}</span>, selected: n === size, onSelect: () => onSize(n) }))} />
    <span className="ui-pager-range ui-num">{from}–{to}{total !== undefined ? ` of ${total}` : ''}</span>
    <span className="ui-pager-nav">
      <IconButton size="sm" label="Previous page" icon={<BbIcon n="chev" s={14} className="ui-pager-prev" />} disabled={!canPrev} onClick={onPrev} />
      <IconButton size="sm" label="Next page" icon={<BbIcon n="chev" s={14} className="ui-pager-next" />} disabled={!canNext} onClick={onNext} />
    </span>
  </div>
}
