import { useId, useState } from 'react'

export function ComingSoonTrade() {
  const hintId = useId()
  const [visible, setVisible] = useState(false)
  return <div className="release-trade" onMouseEnter={() => setVisible(true)} onMouseLeave={() => setVisible(false)}>
    <button type="button" className="bracket primary" aria-disabled="true" aria-describedby={hintId} onFocus={() => setVisible(true)} onBlur={() => setVisible(false)} onClick={() => setVisible(true)} onKeyDown={e => { if (e.key === 'Escape') setVisible(false) }}>
      <i>[</i> TRADE <i>]</i>
    </button>
    <span id={hintId} role="tooltip" className={visible ? 'release-hint visible' : 'release-hint'}>Coming soon</span>
  </div>
}
