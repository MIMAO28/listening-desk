import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { Workspace } from '../types.ts'
import { initialWorkspace } from '../lib/workspace.ts'
function load(key: string): Workspace {
  try { const x = JSON.parse(localStorage.getItem(key) ?? 'null'); if (x?.schemaVersion === 1 && Array.isArray(x.materials) && x.materials.length && x.preferences && x.materials.every((m: any) => typeof m.sourceText === 'string' && Array.isArray(m.sentences) && m.sentences.length && Number.isInteger(m.currentIndex) && m.currentIndex >= 0 && m.currentIndex < m.sentences.length)) return x } catch {}
  return initialWorkspace()
}
export function useWorkspace(owner = 'guest') {
  const key = `listening-desk-workspace:${owner}`
  const [workspace, setWorkspace] = useState<Workspace>(() => load(key))
  const [storageError, setStorageError] = useState('')
  const loaded = useRef(key)
  useLayoutEffect(() => { if (loaded.current !== key) { loaded.current = key; setWorkspace(load(key)) } }, [key])
  const snapshot = useRef({ key, workspace }); snapshot.current = { key, workspace }
  useEffect(() => {
    const save = () => { try { localStorage.setItem(snapshot.current.key, JSON.stringify(snapshot.current.workspace)); setStorageError('') } catch { setStorageError('材料未能保存到本机：浏览器空间不足或禁止存储。关闭页面前请保留原文。') } }
    const timer = setTimeout(save, 250)
    window.addEventListener('pagehide', save)
    return () => { clearTimeout(timer); window.removeEventListener('pagehide', save) }
  }, [key, workspace])
  return { workspace, setWorkspace, storageError }
}
