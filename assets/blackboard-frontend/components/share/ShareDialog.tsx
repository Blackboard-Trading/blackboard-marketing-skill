import { useEffect, useMemo, useRef, useState } from 'react'
import { BRAND } from '../../lib/config'
import { getCandleRange } from '../../lib/data'
import { useApi, useTrader } from '../../lib/hooks'
import { useReferral } from '../../lib/referral'
import { referralLink } from '../../lib/referral-invite'
import { closeShare, shareStore } from '../../lib/share'
import { chartSeries, chartWindow } from '../../lib/share-chart'
import { useStore } from '../../lib/store'
import { errMsg, toast } from '../../lib/toast'
import { fmtRoi } from '../../lib/trade-math'
import { BbIcon } from '../BbIcon'
import { Button, IconButton, Modal, PHONE, roving, Segmented, useCopy, useElementSize, useMedia } from '../primitives'
import { defaultArt, SHARE_ARTS, type ArtId } from './art'
import { CARD_PX, renderShareCardPng, ShareArtThumb, ShareCard, shareSummary, type ShareDisplay } from './ShareCard'

const DISPLAYS: { value: ShareDisplay; label: string }[] = [{ value: 'pnl', label: 'PnL' }, { value: 'roi', label: 'ROI' }, { value: 'both', label: 'PnL & ROI' }]
const ARTS: { value: ArtId; label: string }[] = [{ value: 'none', label: 'None' }, ...SHARE_ARTS.map((a) => ({ value: a.id, label: a.label }))]
const DISPLAY_KEY = 'bb.share.display'
const CHART_KEY = 'bb.share.chart'

function savedDisplay(): ShareDisplay {
  try { const v = localStorage.getItem(DISPLAY_KEY); return v === 'pnl' || v === 'roi' || v === 'both' ? v : 'both' } catch { return 'both' }
}
function savedChart(): boolean {
  try { return localStorage.getItem(CHART_KEY) !== 'off' } catch { return true }
}

export function ShareDialog() {
  const { items, index, open } = useStore(shareStore)
  if (!open || !items.length) return null
  return <ShareFlow key={items.map((m) => m.key).join()} start={index} />
}

function ShareFlow({ start }: { start: number }) {
  const { items } = useStore(shareStore)
  const { address } = useTrader()
  const { data: ref } = useReferral(address)
  const [display, setDisplay] = useState(savedDisplay)
  const [chartOn, setChartOn] = useState(savedChart)
  const [now] = useState(Date.now)
  const [picked, setPicked] = useState<Record<string, ArtId>>({})
  const [i, setI] = useState(start)
  const [busy, setBusy] = useState('')
  const { copied, copy, mark } = useCopy(1600)
  const phone = useMedia(PHONE)
  const [stage, { w: stageW }] = useElementSize<HTMLDivElement>(Math.floor)
  const arts = useRef<HTMLDivElement>(null)
  useEffect(() => { try { localStorage.setItem(DISPLAY_KEY, display) } catch { /* private mode */ } }, [display])
  useEffect(() => { try { localStorage.setItem(CHART_KEY, chartOn ? 'on' : 'off') } catch { /* private mode */ } }, [chartOn])
  const model = items[Math.min(i, items.length - 1)]
  const win = useMemo(() => chartWindow(model.openedAt, model.closedAt, now), [model.openedAt, model.closedAt, now])
  const candles = useApi(win && `share-candles:${model.coin}:${win.interval}:${win.from}:${win.to}`, () => getCandleRange(model.coin, win!.interval, win!.from, win!.to, win!.limit))
  const series = useMemo(() => (win && candles.data ? chartSeries(candles.data, win, model) : null), [win, candles.data, model])
  const chart = chartOn ? series : null
  const chartNote = series ? null : candles.loading ? 'Loading prices…' : 'No price data for this trade'
  const art = picked[model.key] ?? defaultArt(model.roi, model.liquidated)
  const pick = (a: ArtId) => setPicked((p) => ({ ...p, [model.key]: a }))
  useEffect(() => {
    const strip = arts.current, el = strip?.querySelector('.is-active')
    if (!strip || !el) return
    const s = strip.getBoundingClientRect(), r = el.getBoundingClientRect()
    if (r.left < s.left || r.right > s.right) strip.scrollLeft += r.left - s.left - (s.width - r.width) / 2
  }, [model.key])
  const refCode = ref?.code ?? null
  const refLink = refCode ? referralLink(location.origin, refCode) : null
  const link = refLink ?? location.origin
  const png = () => renderShareCardPng({ model, display, art, chart, now })
  const fileName = `blackboard-${model.coin.toLowerCase()}-${model.side}-${fmtRoi(model.roi).replace(/[^0-9.]/g, '')}.png`
  const run = async (k: string, f: () => Promise<void>) => { setBusy(k); try { await f() } catch (e) { toast('error', 'Share failed', errMsg(e)) } finally { setBusy('') } }
  const save = (b: Blob) => { const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = fileName; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 4000) }
  const download = () => run('dl', async () => save(await png()))
  const copyImage = () => run('copy', async () => {
    if (!('ClipboardItem' in window)) throw new Error('This browser cannot copy images. Use Save image.')
    await navigator.clipboard.write([new ClipboardItem({ 'image/png': png() })])
    mark('img')
  })
  const postX = () => window.open(`https://x.com/intent/post?text=${encodeURIComponent(`${shareSummary(model, display)} on ${BRAND}`)}&url=${encodeURIComponent(link)}`, '_blank', 'noopener')
  const nativeShare = () => run('share', async () => {
    const b = await png(); const file = new File([b], fileName, { type: 'image/png' })
    if (navigator.canShare?.({ files: [file] })) await navigator.share({ files: [file], url: link, title: BRAND })
    else save(b)
  })
  const cardW = Math.max(0, Math.min(720, stageW))
  return (
    <Modal title="Share trade" placement="center" onClose={closeShare} busy={!!busy} className="sh-dialog">
      <div className="sh-body">
        <div className="sh-stage">
          <div className="sh-card" ref={stage}>{cardW > 0 && <ShareCard model={model} display={display} art={art} chart={chart} now={now} width={cardW} />}</div>
          {items.length > 1 && <div className="sh-step">
            <IconButton size="sm" variant="outline" label="Previous trade" icon={<BbIcon n="back" s={14} />} disabled={i === 0} onClick={() => setI(i - 1)} />
            <span>Trade {i + 1} of {items.length}</span>
            <IconButton size="sm" variant="outline" label="Next trade" icon={<BbIcon n="next" s={14} />} disabled={i >= items.length - 1} onClick={() => setI(i + 1)} />
          </div>}
        </div>
        <div className="sh-side">
          <section className="sh-sec">
            <h3 className="ui-eyebrow">Show</h3>
            <Segmented options={DISPLAYS} value={display} onChange={setDisplay} label="Show on card" size="sm" block />
            <div className="sh-toggle">
              <span id="sh-chart-label">Price chart</span>
              {chartNote && <span className="sh-note">{chartNote}</span>}
              <button type="button" role="switch" className={'ly-switch' + (chart ? ' is-on' : '')} aria-checked={!!chart} aria-labelledby="sh-chart-label" disabled={!series} onClick={() => setChartOn(!chartOn)} />
            </div>
          </section>
          <section className="sh-sec">
            <h3 className="ui-eyebrow">Illustration <span>{ARTS.find((a) => a.value === art)?.label}</span></h3>
            <div className="sh-arts" role="radiogroup" aria-label="Illustration" ref={arts} onKeyDown={(e) => roving(e, ARTS, art, pick)}>
              {ARTS.map((a) => {
                const on = a.value === art
                return (
                  <button key={a.value} type="button" role="radio" aria-checked={on} tabIndex={on ? 0 : -1} aria-label={a.label} title={a.label}
                    className={'sh-thumb' + (on ? ' is-active' : '')} onClick={() => pick(a.value)}>
                    <ShareArtThumb art={a.value} roi={model.roi} uid={'t-' + a.value} />
                  </button>
                )
              })}
            </div>
          </section>
          <section className="sh-sec">
            <h3 className="ui-eyebrow">{refCode ? 'Your referral link' : 'Link'}</h3>
            <div className="sh-link"><span>{link.replace(/^https?:\/\//, '')}</span><Button size="sm" onClick={() => copy(link)}>{copied === 'copied' ? 'Copied' : 'Copy'}</Button></div>
          </section>
        </div>
      </div>
      {phone ? (
        <div className="sh-foot">
          <Button variant="primary" size="lg" block loading={busy === 'share'} disabled={!!busy} onClick={nativeShare}>Share…</Button>
          <div className="sh-two">
            <Button loading={busy === 'dl'} disabled={!!busy} onClick={download}>Save image</Button>
            <Button disabled={!!busy} onClick={postX}>Post on X</Button>
          </div>
        </div>
      ) : (
        <div className="sh-foot">
          <Button icon={<BbIcon n="download" s={16} />} loading={busy === 'dl'} disabled={!!busy} onClick={download}>Save image</Button>
          <Button icon={<BbIcon n="copy" s={16} />} loading={busy === 'copy'} disabled={!!busy} onClick={copyImage}>{copied === 'img' ? 'Copied' : 'Copy image'}</Button>
          <span className="sh-meta">PNG · {CARD_PX.w} × {CARD_PX.h}</span>
          <Button variant="primary" onClick={postX}>Post on X</Button>
        </div>
      )}
    </Modal>
  )
}
