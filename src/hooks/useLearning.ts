import { useCallback, useEffect, useRef, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { accountClient, accountError } from '../lib/account.ts'
import { dayKey } from '../lib/learning.ts'
import type { CheckResult, LearningSession } from '../lib/learning.ts'
import type { Material } from '../types.ts'

type PendingSession = { id: string; owner: string; material: string; title: string; language: string; day: string; seconds: number; completed: boolean; results: Map<number, CheckResult> }
export function useLearning(user: User | null, material: Material, active: boolean, enabled: boolean) {
  const [sessions, setSessions] = useState<LearningSession[]>([])
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const queue = useRef(new Map<string, PendingSession>())
  const current = useRef<PendingSession | null>(null)
  const busy = useRef<Promise<void> | null>(null)
  const generation = useRef(0)
  const owner = useRef(user?.id)
  owner.current = user?.id
  const inputAt = useRef(-Infinity)
  const source = useRef({ material, active, enabled })
  source.current = { material, active, enabled }
  const ensure = useCallback(() => {
    if (!user) return null
    const mat = source.current.material, day = dayKey()
    if (!current.current || current.current.owner !== user.id || current.current.material !== mat.id + mat.sourceText || current.current.day !== day) {
      current.current = { id: crypto.randomUUID(), owner: user.id, material: mat.id + mat.sourceText, title: mat.title, language: mat.language, day, seconds: 0, completed: false, results: new Map() }
      queue.current.set(current.current.id, current.current)
      try { const key = 'listening-desk-records:' + user.id; const records = JSON.parse(localStorage.getItem(key) ?? '{}'); records[current.current.id] = mat.id; localStorage.setItem(key, JSON.stringify(records)) } catch { /* Workspace resume remains available. */ }
    }
    return current.current
  }, [user?.id])
  const refresh = useCallback(async () => {
    if (!user) return
    const token = generation.current
    setLoading(true)
    try {
      const client = await accountClient()
      const rows: LearningSession[] = []
      // Paginate rather than silently truncating a long-lived account at 1,000 rows.
      for (let offset = 0; ; offset += 1000) {
        const { data, error } = await client.from('learning_sessions').select('id,title,language,study_day,duration_seconds,sentence_count,points,correct_words,total_words,completed,updated_at').eq('user_id', user.id).order('updated_at', { ascending: false }).order('id').range(offset, offset + 999)
        if (error) throw error
        rows.push(...data as LearningSession[])
        if (data.length < 1000) break
      }
      if (token === generation.current) { setSessions(rows); setError('') }
    } catch (error) { if (token === generation.current) setError(accountError(error)) }
    finally { if (token === generation.current) setLoading(false) }
  }, [user?.id])
  const flush = useCallback((): Promise<void> => {
    if (busy.current) return busy.current
    if (!user || queue.current.size === 0) return Promise.resolve()
    const token = generation.current, userId = user.id
    const work = async () => {
      setStatus('saving')
      try {
        const client = await accountClient()
        for (const session of queue.current.values()) {
          if (owner.current !== userId || session.owner !== userId) continue
          const result = await client.rpc('save_learning_session', { p_id: session.id, p_title: session.title, p_language: session.language, p_seconds: Math.floor(session.seconds), p_completed: session.completed })
          if (result.error) throw result.error
          for (const [index, check] of session.results) {
            if (owner.current !== userId) break
            const saved = await client.rpc('submit_learning_sentence', { p_session: session.id, p_index: index, p_correct: check.correct, p_total: check.total })
            if (saved.error) throw saved.error
            if (session.results.get(index) === check) session.results.delete(index)
          }
          if (session !== current.current && session.results.size === 0) queue.current.delete(session.id)
        }
        if (token === generation.current) { setStatus('saved'); setError('') }
      } catch (error) { if (token === generation.current) { setStatus('error'); setError(accountError(error)) } }
    }
    busy.current = work().finally(() => { busy.current = null })
    return busy.current
  }, [user?.id])
  useEffect(() => {
    generation.current++; current.current = null; queue.current.clear(); inputAt.current = -Infinity; setSessions([]); setStatus('idle'); setError('')
    if (user) void refresh()
  }, [user?.id, refresh])
  useEffect(() => {
    if (!user) return
    let previous = performance.now(), ticks = 0
    const timer = setInterval(() => {
      const now = performance.now(), delta = Math.min((now - previous) / 1000, 2); previous = now
      if (document.visibilityState === 'visible' && source.current.enabled && (source.current.active || now - inputAt.current < 60000)) {
        const session = ensure()
        if (session) session.seconds += delta
      }
      if (++ticks % 15 === 0) void flush()
    }, 1000)
    const leave = () => { if (document.visibilityState === 'hidden') void flush() }
    const pageLeave = () => { void flush() }
    document.addEventListener('visibilitychange', leave)
    window.addEventListener('pagehide', pageLeave)
    return () => { clearInterval(timer); document.removeEventListener('visibilitychange', leave); window.removeEventListener('pagehide', pageLeave) }
  }, [user?.id, ensure, flush])
  const touch = () => { inputAt.current = performance.now() }
  const record = async (index: number, result: CheckResult, completed: boolean) => {
    const session = ensure()
    if (!session || result.total === 0) return
    session.results.set(index, result); session.completed ||= completed
    await flush(); await refresh()
  }
  return { sessions, status, error, loading, refresh, flush, touch, record }
}
