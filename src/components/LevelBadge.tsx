import { useState } from 'react'
import type { CSSProperties } from 'react'
import icons from '../lib/levelIcons.json'
import { levelBadge } from '../lib/levelBadges.ts'

export function LevelBadge({ level }: { level: number }) {
  const { icon, name } = levelBadge(level)
  return <span className="level-medallion" role="img" aria-label={`等级 ${level} · ${name}`} title={`Lv.${level} · ${name}`}>
    <span className="level-glyph" style={{ '--level-icon': `url("${import.meta.env.BASE_URL}icons/levels/${icon}.svg")` } as CSSProperties} />
    {level > icons.length && <span className="level-cycle">{level}</span>}
  </span>
}

export function LevelBadgeCollection({ current }: { current: number }) {
  const [open, setOpen] = useState(false)
  const [page, setPage] = useState(() => Math.floor(((Math.max(1, current) - 1) % icons.length) / 40))
  const pages = Math.ceil(icons.length / 40)
  return <details className="level-collection" onToggle={event => setOpen(event.currentTarget.open)}><summary>等级图鉴 · {icons.length.toLocaleString()} 种</summary>
    {open && <>
    <div className="level-gallery-controls"><button className="secondary-button" disabled={page === 0} onClick={() => setPage(p => p - 1)}>上一页</button><select aria-label="等级图鉴页码" value={page} onChange={event => setPage(Number(event.target.value))}>{Array.from({ length: pages }, (_, p) => <option key={p} value={p}>{p + 1} / {pages} 页</option>)}</select><button className="secondary-button" disabled={page === pages - 1} onClick={() => setPage(p => p + 1)}>下一页</button></div>
    <div className="level-collection-grid">{icons.slice(page * 40, page * 40 + 40).map((icon, offset) => {
      const index = page * 40 + offset
      return <div key={icon} className={index + 1 === current ? 'current-level' : ''}>
      <LevelBadge level={index + 1} /><span>Lv.{index + 1} · {levelBadge(index + 1).name}</span>
    </div>})}</div>
    <p className="level-attribution">图标来自 <a href="https://game-icons.net/" target="_blank" rel="noopener noreferrer">Game-icons.net</a>，作者包括 Lorc、Delapouite 等，已随主题重新配色。<a href={`${import.meta.env.BASE_URL}icons/levels/LICENSE.txt`} target="_blank" rel="noopener noreferrer">许可与完整作者名单</a> · <a href={`${import.meta.env.BASE_URL}icons/levels/CREDITS.txt`} target="_blank" rel="noopener noreferrer">逐项来源</a>。全部 {icons.length.toLocaleString()} 种用完后才循环。</p>
    </>}
  </details>
}
