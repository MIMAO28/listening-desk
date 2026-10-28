import { useState } from 'react'
import { Icon } from './Icon.tsx'
import { Yippee } from './Yippee.tsx'

export function HomePage() {
  const [paused, setPaused] = useState(false)
  const browse = () => document.getElementById('languages')?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'start' })
  return <main className={`home-page${paused ? ' motion-paused' : ''}`}>
    <section className="landing-hero" aria-labelledby="landing-title">
      <div className="landing-copy">
        <h1 id="landing-title">让每一次聆听都更接近理解。</h1>
        <p className="landing-description">导入自己的文字，在逐句听写中辨清声音与意义。</p>
        <button className="landing-cta" onClick={browse}>选择语言，开始练习<Icon name="arrow" size={18} /></button>
        <div className="listening-method" aria-label="精听练习流程">
          <p>把一段文字，听得更透彻。</p>
          <ol><li><Icon name="upload" size={17} /><span>导入材料</span></li><li><Icon name="headphones" size={17} /><span>逐句精听</span></li><li><Icon name="edit" size={17} /><span>写下理解</span></li><li><Icon name="search" size={17} /><span>查词译句</span></li></ol>
        </div>
      </div>
      <div className="hero-character"><Yippee paused={paused} /></div>
      <button className="motion-toggle" aria-pressed={paused} onClick={() => setPaused(value => !value)}>
        <Icon name={paused ? 'play' : 'pause'} size={13} />{paused ? '播放动画' : '暂停动画'}</button>
      <button className="landing-scroll" onClick={browse} aria-label="向下查看语言分区"><span>选择你的练习语言</span><span aria-hidden="true">↓</span></button>
    </section>

    <section className="language-section" id="languages" aria-labelledby="languages-title">
      <div className="language-section-heading"><h2 id="languages-title">选择练习语言</h2><p>先试听示例，或直接导入你的材料。</p></div>
      <div className="language-grid">
        <a className="language-card english-card" href="#/practice/en" aria-label="进入英语精听">
          <div className="language-symbol english-symbol" aria-hidden="true"><span>Aa</span><svg viewBox="0 0 80 35" fill="none"><path d="M7 18h7l5-11 9 22 9-27 9 23 7-12 6 5h14" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></svg></div>
          <div className="language-card-copy"><div><h3>英语</h3><p>English listening</p></div><Icon name="arrow" size={22} /></div>
        </a>
        <a className="language-card japanese-card" href="#/practice/ja" aria-label="进入日语精听">
          <div className="language-symbol japanese-symbol" aria-hidden="true"><span>あ</span><svg viewBox="0 0 80 35" fill="none"><path d="M12 12h9M16 8v9M62 19h9M66 15v9M33 19q6 8 14 0" stroke="currentColor" strokeWidth="3" strokeLinecap="round" /></svg></div>
          <div className="language-card-copy"><div><h3>日语</h3><p lang="ja">日本語リスニング</p></div><Icon name="arrow" size={22} /></div>
        </a>
      </div>
    </section>
    <footer className="landing-footer"><span>听写练习台 · 专注于语言本身</span>
      <details className="character-credit"><summary>配色与角色来源</summary><p>17 套基础配色来自 <a href="https://www.happyhues.co/" target="_blank" rel="noopener noreferrer">Happy Hues</a>，已适配阅读界面与日夜模式。角色 <a href="https://rive.app/marketplace/27915-52755-yippee/" target="_blank" rel="noopener noreferrer">Yippee</a>，作者 <a href="https://rive.app/@gianluigi.ranauro" target="_blank" rel="noopener noreferrer">gianluigi.ranauro</a>，采用 <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener noreferrer">CC BY 4.0</a>。本站裁取原动画的耳机角色，随主题重新映射配色，并添加网页悬停与点击反馈。</p></details>
    </footer>
  </main>
}
