import { useEffect, useRef, useState } from 'react'
import { COLOR_THEMES, getColorTheme } from '../lib/colorThemes.ts'
import { Icon } from './Icon.tsx'

export function ThemePicker({ value, onChange }: { value: string; onChange: (id: string) => void }) {
  const [open, setOpen] = useState(false)
  const dialog = useRef<HTMLDialogElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const selected = getColorTheme(value)
  const close = () => { dialog.current?.close(); setOpen(false); trigger.current?.focus({ preventScroll: true }) }
  useEffect(() => {
    if (!open) return
    const element = dialog.current!
    element.showModal()
    requestAnimationFrame(() => element.querySelector<HTMLElement>('[aria-checked="true"]')?.focus())
    return () => element.close()
  }, [open])
  const move = (event: React.KeyboardEvent, index: number) => {
    const columns = window.matchMedia('(max-width: 440px)').matches ? 2 : 3
    const offset = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: columns, ArrowUp: -columns, Home: -index, End: COLOR_THEMES.length - 1 - index }[event.key]
    if (offset === undefined) return
    event.preventDefault()
    const next = (index + offset + COLOR_THEMES.length) % COLOR_THEMES.length
    onChange(COLOR_THEMES[next].id)
    dialog.current?.querySelectorAll<HTMLButtonElement>('.color-theme-option')[next]?.focus()
  }
  return <>
    <button ref={trigger} className="color-theme-toggle" type="button" aria-label="选择主题配色" aria-haspopup="dialog" onClick={() => setOpen(true)} title={`主题配色：${selected.name}`}>
      <span className="theme-toggle-swatches" aria-hidden="true">{selected.swatches.slice(0, 3).map((color, i) => <i key={i} style={{ background: color }} />)}</span><span>配色</span>
    </button>
    {open && <dialog ref={dialog} className="color-theme-dialog" aria-labelledby="color-theme-title" onCancel={event => { event.preventDefault(); close() }} onClick={event => { if (event.target === dialog.current) { const r = dialog.current.getBoundingClientRect(); if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) close() } }}>
      <div className="color-theme-heading"><div><h2 id="color-theme-title">主题配色</h2><p>17 套 Happy Hues 配色，点击即可预览。</p></div><button className="icon-button" aria-label="关闭主题配色" onClick={close}><Icon name="close" /></button></div>
      <div className="color-theme-grid" role="radiogroup" aria-label="Happy Hues 主题">
        {COLOR_THEMES.map((theme, index) => <button key={theme.id} className="color-theme-option" role="radio" aria-checked={theme.id === selected.id} tabIndex={theme.id === selected.id ? 0 : -1} aria-label={`${String(theme.number).padStart(2, '0')} ${theme.name}`} onKeyDown={event => move(event, index)} onClick={() => onChange(theme.id)}>
          <span className="color-theme-swatches" aria-hidden="true">{theme.swatches.map((color, i) => <i key={i} style={{ background: color }} />)}</span>
          <span className="color-theme-name"><span><small>{String(theme.number).padStart(2, '0')}</small>{theme.name}</span>{theme.id === selected.id && <Icon name="check" size={16} />}</span>
        </button>)}
      </div>
      <div className="color-theme-footer"><span>已适配日间与深夜 · <a href={selected.sourceUrl} target="_blank" rel="noopener noreferrer">查看官网 #{selected.number}</a></span><button className="primary-button" onClick={close}>完成</button></div>
    </dialog>}
  </>
}
