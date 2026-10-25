import { toneOf } from '../../lib/trade-math'

/** Colour role of tags, dots and segmented options. */
export type Tone = 'neutral' | 'up' | 'down' | 'warn' | 'accent'
/** Text colour roles; each is a `.ui-*` class. */
export type TextTone = 'up' | 'down' | 'warn' | 'muted'
type Sign = ReturnType<typeof toneOf>

const SIGN_CLASS = { pos: 'ui-up', neg: 'ui-down', zero: 'ui-muted' } as const
const SIGN_TONE = { pos: 'up', neg: 'down', zero: undefined } as const

/** Text class of a signed value; zero reads muted. Takes the value, or a sign computed with another threshold. */
export const toneClass = (v: number | Sign) => SIGN_CLASS[typeof v === 'number' ? toneOf(v) : v]

/** `up` / `down` for a signed value; nothing for zero or a missing value. */
export const uiTone = (n?: number | null) => (n ? SIGN_TONE[toneOf(n)] : undefined)
