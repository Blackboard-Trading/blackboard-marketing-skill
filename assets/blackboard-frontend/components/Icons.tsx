import btcLogo from '../assets/coins/btc-logo.svg'
import btcWatermark from '../assets/coins/btc-watermark.png'
import ring from '../assets/coins/coin-ring.png'
import ethLogo from '../assets/coins/eth-logo.svg'
import ethWatermark from '../assets/coins/eth-watermark.png'

/** A 24px logo on a 26px white chalk ring; `mark` is the faint ring-and-logo drawn behind table rows. */
const COIN_ART: Record<string, { logo: string; mark: string }> = {
  BTC: { logo: btcLogo, mark: btcWatermark },
  ETH: { logo: ethLogo, mark: ethWatermark },
}

export function CoinIcon({ coin, size = 28, mark = false }: { coin: string; size?: number; mark?: boolean }) {
  const c = String(coin).toUpperCase()
  const art = COIN_ART[c]
  if (art) return (
    <span className="coinic coin-art" style={{ width: size, height: size }}>
      <img src={mark ? art.mark : ring} alt="" width={size} height={size} />
      {!mark && <img className="coin-art-logo" src={art.logo} alt="" />}
    </span>
  )
  return (
    <span className={'coinic ' + c.toLowerCase()} style={{ width: size, height: size }}>
      <b style={{ fontSize: size * 0.4 }}>{c[0]}</b>
    </span>
  )
}

/** Chalk dropdown triangle (Figma 12×9), drawn in `currentColor`; flips while `open`. */
export function Caret({ open = false, className }: { open?: boolean; className?: string }) {
  return <span className={'ui-caret ui-caret-tri' + (open ? ' is-open' : '') + (className ? ' ' + className : '')} aria-hidden />
}

export const Chev = ({ up = false }: { up?: boolean }) => (
  <svg className={'chev' + (up ? ' up' : '')} viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden>
    <path d="M2 3.5 5 6.5 8 3.5" />
  </svg>
)

export const CopyIcon = () => <span className="ui-copy-ico" aria-hidden />
export const ShareIcon = () => <span className="ui-share-ico" aria-hidden />
