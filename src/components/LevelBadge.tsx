import type { CSSProperties } from 'react'
import icons from '../lib/levelIcons.json'

const names = ['萌芽', '初羽', '笔耕', '启卷', '明悟', '探索', '思辨', '洞察', '桂冠', '荣光', '晶钻', '远见', '澄心', '赤诚', '凌羽', '曜阳', '星轨', '星旋', '星河', '永恒']

export function LevelBadge({ level }: { level: number }) {
  const index = (Math.max(1, Math.floor(level)) - 1) % icons.length
  const icon = icons[index]
  return <span className="level-medallion" role="img" aria-label={`等级 ${level} · ${names[index]}`} title={`Lv.${level} · ${names[index]}`}>
    <span className="level-glyph" style={{ '--level-icon': `url("${import.meta.env.BASE_URL}icons/levels/${icon.id}.svg")` } as CSSProperties} />
    {level > icons.length && <span className="level-cycle">{level}</span>}
  </span>
}

export function LevelBadgeCollection({ current }: { current: number }) {
  return <details className="level-collection"><summary>等级图鉴</summary>
    <div className="level-collection-grid">{icons.map((icon, index) => <div key={icon.id} className={index + 1 === current ? 'current-level' : ''}>
      <LevelBadge level={index + 1} /><span>Lv.{index + 1} · {names[index]}</span>
    </div>)}</div>
    <p className="level-attribution">图标作者 Lorc、Delapouite · <a href="https://game-icons.net/" target="_blank" rel="noopener noreferrer">Game-icons.net</a> · <a href="https://creativecommons.org/licenses/by/3.0/" target="_blank" rel="noopener noreferrer">CC BY 3.0</a> · 已随主题重新配色。<a href={`${import.meta.env.BASE_URL}icons/levels/CREDITS.txt`} target="_blank" rel="noopener noreferrer">逐项来源</a></p>
  </details>
}
