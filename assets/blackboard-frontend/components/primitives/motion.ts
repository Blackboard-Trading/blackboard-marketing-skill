import { useEffect, useState } from 'react'

export const DUR = { fast: 120, base: 180, slow: 260, collapse: 220 } as const

export const reducedMotion = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches

export type Presence = 'enter' | 'exit' | null

/** Keeps a closing element mounted for its exit animation. Timer-based, so it also settles when animations are disabled. */
export function usePresence(open: boolean, exitMs: number = DUR.fast): Presence {
  const [state, setState] = useState<Presence>(open ? 'enter' : null)
  useEffect(() => {
    if (open) { setState('enter'); return }
    if (reducedMotion() || exitMs <= 0) { setState(null); return }
    setState((s) => (s ? 'exit' : null))
    const t = setTimeout(() => setState(null), exitMs)
    return () => clearTimeout(t)
  }, [open, exitMs])
  return open ? 'enter' : state
}
