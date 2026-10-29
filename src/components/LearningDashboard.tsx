import { useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { dayKey, learningSummary, levelProgress } from '../lib/learning.ts'
import type { LearningSession } from '../lib/learning.ts'
import { LevelBadge, LevelBadgeCollection } from './LevelBadge.tsx'

export function LearningDashboard({ user, sessions, loading, error, onLogin, onRefresh }: {
  user: User | null; sessions: LearningSession[]; loading: boolean; error: string; onLogin: () => void; onRefresh: () => void
}) {
  const today = dayKey(), summary = learningSummary(sessions, today), level = levelProgress(summary.points)
  const [selected, setSelected] = useState(today)
  const days = Array.from({ length: 30 }, (_, index) => {
    const date = new Date(`${today}T12:00:00+08:00`); date.setUTCDate(date.getUTCDate() - 29 + index); return dayKey(date)
  })
  const selectedSessions = sessions.filter(s => s.study_day === selected)
  if (!user) return <main className="learning-page"><h1>学习面板</h1><div className="dashboard-empty"><h2>让每一次练习留下积累</h2><p>登录后查看自己的练习时长、连续学习天数和等级。</p><button className="primary-button" onClick={onLogin}>邮箱登录</button><a href="#/practice/en">先以游客练习</a></div></main>
  return <main className="learning-page">
    <div className="learning-heading"><div><h1>学习面板</h1><p>{user.email?.split('@')[0]}，这里是你的练习记录。</p></div><button className="secondary-button" disabled={loading} onClick={onRefresh}>{loading ? '读取中…' : '刷新记录'}</button></div>
    {error && <div className="alert error" role="alert">{error} <button className="text-button" onClick={onRefresh}>重试</button></div>}
    {loading && sessions.length === 0 ? <p role="status">正在读取你的学习记录…</p> : <>
    <section className="level-panel" aria-label="学习等级"><LevelBadge level={level.level} /><div className="level-description"><h2>Lv.{level.level} {level.title}</h2><div className="level-numbers"><span>累计 {summary.points} 分</span><span>再得 {level.toNext - level.current} 分升级</span></div><progress max={level.toNext} value={level.current} aria-label="升级进度" /><small>每写对一个英文单词得 1 分；同一轮同一句反复检查只补新增分数。等级代表练习积累，不是语言能力评级。</small></div></section>
    <LevelBadgeCollection current={level.level} />
    <section className="study-streak"><strong>连续学习 <b>{summary.streak}</b> 天</strong><span>完成并检查至少一句听写，记作当天学习。按北京时间统计。</span></section>
    <div className="learning-stats" aria-label="最近30天统计">{[
      ['练习时长', `${Math.floor(summary.seconds / 60)} 分钟`], ['已检查句子', `${summary.sentences} 句`], ['词语命中率', summary.accuracy === null ? '—' : `${summary.accuracy}%`], ['完成材料', `${summary.completed} 篇`],
    ].map(([label, value]) => <div key={label}><span>{label}</span><strong>{value}</strong><small>最近 30 天</small></div>)}</div>
    <section className="study-history"><h2>练习日历</h2><div className="study-calendar" aria-label="最近30天练习日期">{days.map(day => <button key={day} aria-label={`${day}${summary.days.has(day) ? ' 已练习' : ''}`} aria-pressed={selected === day} className={`${summary.days.has(day) ? 'studied' : ''} ${day === today ? 'today' : ''}`} onClick={() => setSelected(day)}><small>{day.slice(5, 7)}月</small><span>{Number(day.slice(8))}</span></button>)}</div><div className="history-details"><h3>{selected}{selected === today && ' · 今天'}</h3>{selectedSessions.length === 0 ? <p>这一天还没有练习记录。</p> : <ul>{selectedSessions.map(s => <li key={s.id}><div><strong>{s.title}</strong><span>{s.language === 'ja-JP' ? '日语' : '英语'} · {s.completed ? '已完成' : '练习中'}</span></div><span>{Math.floor(s.duration_seconds / 60)}分{s.duration_seconds % 60}秒</span><span>{s.sentence_count}句 · {s.points}分</span></li>)}</ul>}</div></section>
    <div className="dashboard-next"><a className="primary-button" href="#/practice/en">练习英语</a><a className="secondary-button" href="#/practice/ja">练习日语</a></div>
    </>}
  </main>
}
