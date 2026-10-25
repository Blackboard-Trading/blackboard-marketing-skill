import { useCallback, useEffect, useRef, useState } from 'react'

/** Phone layout; matches the `max-width: 760px` blocks in the stylesheets. */
export const PHONE = '(max-width: 760px)'
export const COMPACT = '(max-width: 1023px)'

/** True while `query` matches and `enabled`; false on the server and wherever matchMedia is missing. */
export function useMedia(query: string, enabled = true) {
  const [on, setOn] = useState(() => enabled && typeof matchMedia === 'function' && matchMedia(query).matches)
  useEffect(() => {
    if (!enabled || typeof matchMedia !== 'function') return
    const mq = matchMedia(query), sync = () => setOn(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [query, enabled])
  return enabled && on
}

/** Content-box size of the element behind `ref`, rounded with `round`; 0 × 0 until measured. */
export function useElementSize<T extends HTMLElement>(round: (n: number) => number = Math.round) {
  const ref = useRef<T>(null)
  const [size, setSize] = useState({ w: 0, h: 0 })
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => {
      const w = round(e.contentRect.width), h = round(e.contentRect.height)
      setSize((s) => (s.w === w && s.h === h ? s : { w, h }))
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [round])
  return [ref, size] as const
}

/** Writes to the clipboard; resolves false when the write fails, undefined without a clipboard. */
export const copyText = (text: string) => navigator.clipboard?.writeText(text).then(() => true, () => false)

/** Copy with a transient mark: `copied` holds the key of the last copy for `ms`. */
export function useCopy(ms: number) {
  const [copied, setCopied] = useState('')
  const t = useRef<ReturnType<typeof setTimeout>>(undefined)
  useEffect(() => () => clearTimeout(t.current), [])
  /** Shows the mark without writing (for copies done elsewhere, e.g. an image). */
  const mark = useCallback((key = 'copied') => {
    setCopied(key)
    clearTimeout(t.current)
    t.current = setTimeout(() => setCopied(''), ms)
  }, [ms])
  const copy = useCallback((text: string, key = 'copied') => {
    void copyText(text)
    mark(key)
  }, [mark])
  return { copied, copy, mark }
}
