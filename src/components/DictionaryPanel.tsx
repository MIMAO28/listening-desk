import { useCallback, useEffect, useRef, useState } from 'react'
import { Icon } from './Icon.tsx'
import { assetUrl } from '../lib/assetUrl.ts'
import { DICTIONARY_QUERY_LIMIT, dictionaryQuery, lookupQuery, lookupChineseDictionary, translateReading, youdaoUrl } from '../lib/dictionary.ts'
import type { ChineseDictionaryResult } from '../lib/dictionary.ts'

export function DictionaryPanel({ selection, language = 'en-US' }: { selection?: { text: string; nonce: number }; language?: string }) {
  const [input, setInput] = useState('')
  const [query, setQuery] = useState('')
  const [result, setResult] = useState<ChineseDictionaryResult | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [translation, setTranslation] = useState('')
  const [floating, setFloating] = useState(false)
  const controller = useRef<AbortController | null>(null)
  const generation = useRef(0)
  const field = useRef<HTMLInputElement>(null)

  const search = useCallback(async (value: string) => {
    controller.current?.abort()
    const ticket = ++generation.current
    setResult(null); setTranslation(''); setError(''); setLoading(false); setQuery('')
    let word: string
    try { word = lookupQuery(value) }
    catch (problem) { setError((problem as Error).message); return }
    setInput(word); setQuery(word); setLoading(true)
    const request = new AbortController()
    controller.current = request
    const timeout = window.setTimeout(() => request.abort(), 25_000)
    try {
      let dictionaryWord = ''
      try { dictionaryWord = dictionaryQuery(word) } catch { /* Punctuation or a longer selection is translated as a sentence. */ }
      const sentence = !dictionaryWord || /[。！？!?]/u.test(word) || language.startsWith('ja') && word.length > 12
      const found = sentence ? null : await lookupChineseDictionary(dictionaryWord, request.signal)
      if (ticket !== generation.current) return
      if (request.signal.aborted) setError('查询超时，请重试。')
      else if (found) setResult(found)
      else if (sentence || /\s/u.test(word) || language.startsWith('ja')) {
        const translated = await translateReading(word, language, request.signal)
        if (ticket === generation.current) setTranslation(translated)
      } else setError('暂未找到中文词义，试试单词原形，或打开详细词典。')
    } catch (problem) {
      if (ticket === generation.current) setError(request.signal.aborted ? '查询超时，请重试。' : /^(查询次数较多|翻译服务)/.test((problem as Error).message) ? (problem as Error).message : '中文释义暂时不可用，请重试或打开详细词典。')
    } finally {
      window.clearTimeout(timeout)
      if (ticket === generation.current) setLoading(false)
    }
  }, [language])

  useEffect(() => {
    if (!selection) return
    if (window.matchMedia('(max-width: 1100px)').matches) setFloating(true)
    void search(selection.text)
    field.current?.focus({ preventScroll: true })
  }, [selection, search])
  useEffect(() => () => { generation.current++; controller.current?.abort() }, [])

  const edit = (value: string) => {
    generation.current++; controller.current?.abort()
    setInput(value); setResult(null); setTranslation(''); setQuery(''); setLoading(false); setError('')
  }
  const visible = result?.meanings
  return <><button className="dictionary-fab" aria-label={floating ? '收起查词窗口' : '打开查词窗口'} aria-expanded={floating} aria-controls="reading-dictionary" onClick={() => { setFloating(value => !value); requestAnimationFrame(() => field.current?.focus({ preventScroll: true })) }}><Icon name="search" size={17} />{floating ? '收起查词' : '查词 / 译句'}</button>
    <aside id="reading-dictionary" className={`dictionary-panel${floating ? ' is-floating' : ''}`} aria-labelledby="dictionary-title">
    <div className="dictionary-search-header"><div className="dictionary-heading"><h2 id="dictionary-title">查词 / 译句</h2><button className="dictionary-close panel-icon-button" aria-label="关闭查词窗口" onClick={() => setFloating(false)}><Icon name="close" size={16} /></button></div>
    <form className="dictionary-form" onSubmit={event => { event.preventDefault(); void search(input) }}>
      <label className="sr-only" htmlFor="dictionary-query">单词或短语</label>
      <div className="dictionary-input-row"><input ref={field} id="dictionary-query" type="search" value={input}
        maxLength={DICTIONARY_QUERY_LIMIT} autoComplete="off" spellCheck={false} autoCapitalize="off"
        placeholder={language === 'ja-JP' ? '日语单词或整句' : '输入单词、短语或整句'} title="支持单词多义查询与整句中文翻译" onChange={event => edit(event.target.value)} />
        <button className="dictionary-submit" type="submit" aria-label="查词" title="查词或翻译整句"><Icon name="search" size={18} /></button></div>
    </form></div>
    <div className="dictionary-results" aria-busy={loading} aria-live="polite">
      {loading && <p className="dictionary-message" role="status">正在查询中文释义或译文…</p>}
      {error && <p className="dictionary-error" role="alert">{error}</p>}
      {result && <div className="chinese-result"><h3 className="dictionary-word">{result.word}</h3>
        <ol className="chinese-meanings">{visible?.map((meaning, index) => <li key={`${meaning.translation}-${index}`}>
          {(meaning.headword !== visible?.[index - 1]?.headword || meaning.partOfSpeech !== visible?.[index - 1]?.partOfSpeech) && <span className="meaning-part">{[meaning.headword, meaning.partOfSpeech].filter(Boolean).join(' · ')}</span>}<span className="chinese-meaning">{meaning.translation}</span>
        </li>)}</ol>
        <details className="dictionary-sources"><summary>词义来源</summary>
          {result.source === 'ecdict' ? <p><a href={result.sourceUrl} target="_blank" rel="noopener noreferrer">开源英汉词库</a> · <a href={assetUrl('dictionaries/ECDICT-LICENSE.txt')} target="_blank" rel="noopener noreferrer">开放许可</a></p>
            : <p><a href={result.sourceUrl} target="_blank" rel="noopener noreferrer">在线词典</a>的中文译文，<a href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="noopener noreferrer">开放许可</a>；翻译由 <a href="https://mymemory.translated.net/" target="_blank" rel="noopener noreferrer">MyMemory</a> 提供，请结合语境理解。</p>}
        </details>
      </div>}
      {translation && <div className="sentence-translation"><h3>参考译文</h3><p>{translation}</p><a href="https://mymemory.translated.net/" target="_blank" rel="noopener noreferrer">MyMemory 翻译</a></div>}
    </div>
    {error && query && <a className="dictionary-fallback" href={youdaoUrl(query)} target="_blank" rel="noopener noreferrer">打开详细词典 ↗</a>}
  </aside></>
}
