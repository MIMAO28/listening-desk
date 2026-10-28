import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import type { CSSProperties } from 'react'
import type { Material, Preferences } from './types.ts'
import { SpeechPlayer } from './lib/speechPlayer.ts'
import { PracticeSpeechPort } from './lib/practiceSpeechPort.ts'
import { naturalVoiceChoices, naturalVoiceId } from './lib/naturalVoices.ts'
import { useAccount } from './hooks/useAccount.ts'
import { useLearning } from './hooks/useLearning.ts'
import { checkAnswer } from './lib/learning.ts'
import type { CheckResult } from './lib/learning.ts'
import { AccountDialog } from './components/AccountDialog.tsx'
import { LearningDashboard } from './components/LearningDashboard.tsx'
import { RATES } from './lib/workspace.ts'
import { useWorkspace } from './hooks/useWorkspace.ts'
import { Icon } from './components/Icon.tsx'
import { ImportDialog } from './components/ImportDialog.tsx'
import { DictionaryPanel } from './components/DictionaryPanel.tsx'
import { HomePage } from './components/HomePage.tsx'
import { routeFromHash } from './lib/navigation.ts'
import { voiceDescription, voiceLabel } from './lib/voiceLabels.ts'
import { englishVoiceChoices, isNaturalVoice } from './lib/preferredEnglishVoice.ts'
import { DICTIONARY_QUERY_LIMIT } from './lib/dictionary.ts'
import { characterChannels, themeTokens } from './lib/colorThemes.ts'
import { ThemePicker } from './components/ThemePicker.tsx'

export function App() {
  const { workspace, setWorkspace } = useWorkspace()
  const [route, setRoute] = useState(() => routeFromHash(window.location.hash))
  const [speechPort] = useState(() => new PracticeSpeechPort())
  const [player] = useState(() => new SpeechPlayer(speechPort))
  const playback = useSyncExternalStore(player.subscribe, player.getSnapshot)
  const audioStatus = useSyncExternalStore(speechPort.subscribe, speechPort.getSnapshot)
  const preparation = useSyncExternalStore(speechPort.subscribe, speechPort.getPreparation)
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>(naturalVoiceChoices)
  const account = useAccount()
  const [accountOpen, setAccountOpen] = useState(false)
  const [check, setCheck] = useState<CheckResult | null>(null)
  const [checkError, setCheckError] = useState('')
  const checkedSentences = useRef(new Map<string, Set<number>>())
  const [voiceChecked, setVoiceChecked] = useState(false)
  const [importMode, setImportMode] = useState<'new' | 'edit' | null>(null)
  const [focused, setFocused] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [readingSize, setReadingSize] = useState(18)
  const [transcriptWidth, setTranscriptWidth] = useState(50)
  const [lookupSelection, setLookupSelection] = useState<{ text: string; nonce: number }>()
  const [notice, setNotice] = useState('')
  const [peek, setPeek] = useState(false)
  const [repeatThree, setRepeatThree] = useState(false)
  const manualVoices = useRef(new Map<string, string>())
  const focusButton = useRef<HTMLButtonElement>(null)
  const focusScroll = useRef(0)
  const dictationInput = useRef<HTMLTextAreaElement>(null)
  const currentRow = useRef<HTMLButtonElement>(null)
  const practiceArea = useRef<HTMLDivElement>(null)
  const sessionLanguage = route === 'ja' ? 'ja-JP' : 'en-US'
  const sessionMaterials = workspace.materials.filter(item => item.language === sessionLanguage)
  const material = sessionMaterials.find(item => item.id === workspace.activeId) ?? sessionMaterials[0]
  const preferences = workspace.preferences
  const colors = useMemo(() => themeTokens(preferences.colorTheme, preferences.theme), [preferences.colorTheme, preferences.theme])
  const channels = useMemo(() => characterChannels(colors), [colors])
  const navigationIndex = useRef(material.currentIndex)
  navigationIndex.current = material.currentIndex
  const supported = 'AudioContext' in window
  const availableVoices = voices.filter(voice => voice.lang.replace('_', '-').startsWith(material.language.split('-')[0]))
    .sort((a, b) => Number(b.localService) - Number(a.localService) || a.name.localeCompare(b.name))
  const languageVoices = material.language.startsWith('en') ? [...voices.filter(v => naturalVoiceId(v.voiceURI)), ...englishVoiceChoices(availableVoices.filter(v => !naturalVoiceId(v.voiceURI)))] : availableVoices
  const selectedVoice = languageVoices.find(voice => voice.voiceURI === preferences.voiceURI)
  const natural = !!selectedVoice && !!naturalVoiceId(selectedVoice.voiceURI)
  const naturalReady = natural && speechPort.isReady(material.sentences.map(s => s.text), selectedVoice!.voiceURI)
  const canPlay = !!selectedVoice && supported && (!natural || naturalReady)
  const inProgress = playback.status === 'playing' || playback.status === 'waiting'
  const previewActive = playback.mode === 'single' && (inProgress || playback.status === 'paused')
  const continuousPlayback = playback.mode === 'continuous' && (inProgress || playback.status === 'paused')
  const practiceRoute = route === 'en' || route === 'ja'
  const learning = useLearning(account.user, material, practiceRoute && playback.status === 'playing' && !previewActive && (natural || audioStatus !== 'loading'), practiceRoute)
  const answer = material.answers?.[material.sentences[material.currentIndex].id] ?? ''
  useLayoutEffect(() => { speechPort.cancelPreparation() }, [speechPort, material.id, material.sourceText, selectedVoice?.voiceURI])

  useEffect(() => { if (account.recovery) setAccountOpen(true) }, [account.recovery])
  useEffect(() => { setCheck(null); setCheckError('') }, [material.id, material.currentIndex])
  useEffect(() => {
    if (route === 'dashboard' && account.user) void learning.flush().then(learning.refresh)
  }, [route, account.user?.id])

  useEffect(() => {
    window.history.scrollRestoration = 'manual'
    window.scrollTo({ top: 0, behavior: 'instant' })
  }, [])

  useEffect(() => {
    const navigate = () => {
      player.stop()
      setRoute(routeFromHash(window.location.hash)); setFocused(false); setImportMode(null); setSettingsOpen(false)
      setLookupSelection(undefined); setNotice('')
      window.scrollTo({ top: 0, behavior: 'instant' })
    }
    window.addEventListener('hashchange', navigate)
    return () => window.removeEventListener('hashchange', navigate)
  }, [player])
  useEffect(() => {
    if (route === 'home') return
    setWorkspace(previous => {
      const active = previous.materials.find(item => item.id === previous.activeId)
      if (active?.language === sessionLanguage) return previous
      const next = previous.materials.find(item => item.language === sessionLanguage)
      return next ? { ...previous, activeId: next.id } : previous
    })
  }, [route, sessionLanguage, setWorkspace])

  useLayoutEffect(() => {
    document.documentElement.dataset.theme = preferences.theme
    document.documentElement.dataset.colorTheme = preferences.colorTheme
    for (const [name, value] of Object.entries(colors)) document.documentElement.style.setProperty(name, value)
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content',
      getComputedStyle(document.documentElement).getPropertyValue('--bg').trim())
  }, [preferences.theme, preferences.colorTheme, colors])

  const updatePreferences = useCallback((patch: Partial<Preferences>) => {
    setWorkspace(previous => ({ ...previous, preferences: { ...previous.preferences, ...patch } }))
  }, [setWorkspace])
  const updateMaterial = useCallback((id: string, patch: Partial<Material>) => {
    setWorkspace(previous => ({ ...previous, materials: previous.materials.map(item =>
      item.id === id ? { ...item, ...patch, updatedAt: new Date().toISOString() } : item) }))
  }, [setWorkspace])
  useEffect(() => {
    const index = playback.sentenceIndex
    if (playback.mode === 'continuous' && index !== null && index >= 0
      && index < material.sentences.length && index !== material.currentIndex) {
      updateMaterial(material.id, { currentIndex: index })
    }
  }, [playback.mode, playback.sentenceIndex, material.id, material.currentIndex, material.sentences.length, updateMaterial])
  const refreshVoices = useCallback(() => {
    if (!supported) return
    setVoices([...naturalVoiceChoices(), ...('speechSynthesis' in window ? window.speechSynthesis.getVoices() : [])])
  }, [supported])

  useEffect(() => {
    if (!supported) return
    refreshVoices()
    window.speechSynthesis?.addEventListener('voiceschanged', refreshVoices)
    const timer = setTimeout(() => { refreshVoices(); setVoiceChecked(true) }, 1500)
    return () => { clearTimeout(timer); window.speechSynthesis?.removeEventListener('voiceschanged', refreshVoices) }
  }, [refreshVoices, supported])
  useEffect(() => () => player.stop(), [player])
  useEffect(() => {
    if (voices.length === 0) return
    const english = material.language.startsWith('en')
    const available = english ? [...voices.filter(v => naturalVoiceId(v.voiceURI)), ...englishVoiceChoices(voices.filter(v => !naturalVoiceId(v.voiceURI)))]
      : voices.filter(voice => voice.lang.replace('_', '-').startsWith(material.language.split('-')[0]))
    const currentAvailable = available.find(voice => voice.voiceURI === preferences.voiceURI)
    const explicit = available.find(voice => voice.voiceURI === manualVoices.current.get(material.language))
    const active = playback.status === 'playing' || playback.status === 'waiting' || playback.status === 'paused'
    if (!currentAvailable || english && !active && currentAvailable !== explicit) {
      const local = available.find(voice => voice.localService && voice.lang === material.language)
        ?? available.find(voice => voice.localService)
      const uri = explicit?.voiceURI ?? (english ? available[0]?.voiceURI : local?.voiceURI) ?? ''
      if (uri !== preferences.voiceURI) { player.stop(); updatePreferences({ voiceURI: uri }) }
    }
  }, [voices, material.language, preferences.voiceURI, playback.status, player, updatePreferences])
  useEffect(() => {
    if (!selectedVoice) return
    const index = material.currentIndex
    const nearby = [index + 1, index - 1, index + 2, index - 2, index + 3, index]
      .filter(position => position >= 0 && position < material.sentences.length)
      .map(position => material.sentences[position].text)
    speechPort.prepare(nearby,
      { language: material.language, voiceURI: selectedVoice.voiceURI, rate: preferences.rate }, selectedVoice)
  }, [speechPort, selectedVoice, material.sentences, material.currentIndex, material.language, preferences.rate])
  useEffect(() => {
    setPeek(false)
    const row = currentRow.current
    const list = row?.closest<HTMLElement>('.sentence-list')
    if (!row || !list) return
    const bounds = row.getBoundingClientRect()
    const viewport = list.getBoundingClientRect()
    if (bounds.top < viewport.top) list.scrollTop -= viewport.top - bounds.top
    else if (bounds.bottom > viewport.bottom) list.scrollTop += bounds.bottom - viewport.bottom
  }, [material.id, material.currentIndex])
  useEffect(() => {
    if (!notice) return
    const timer = setTimeout(() => setNotice(''), 5000)
    return () => clearTimeout(timer)
  }, [notice])

  const settings = { language: material.language, rate: preferences.rate, voiceURI: preferences.voiceURI }
  const selectSentence = (index: number) => {
    if (index < 0 || index >= material.sentences.length) return
    navigationIndex.current = index
    if (canPlay) player.playAll(material.sentences.map(sentence => sentence.text), settings, index, repeatThree ? 3 : 1)
    else player.stop()
    updateMaterial(material.id, { currentIndex: index })
  }
  const play = () => {
    if (natural && !naturalReady && selectedVoice) {
      if (preparation.status !== 'loading') speechPort.prepareNatural(material.sentences.map(s => s.text), selectedVoice.voiceURI)
      return
    }
    if (!canPlay) return
    if (previewActive) player.playAll(material.sentences.map(sentence => sentence.text), settings, material.currentIndex, repeatThree ? 3 : 1)
    else if (playback.status === 'paused') player.resume()
    else if (inProgress) player.pause()
    else player.playAll(material.sentences.map(sentence => sentence.text), settings, material.currentIndex, repeatThree ? 3 : 1)
  }
  const jump = (offset: number) => {
    const live = player.getSnapshot()
    const liveContinuous = live.mode === 'continuous' && live.status !== 'idle' && live.status !== 'error'
    const currentIndex = liveContinuous ? live.sentenceIndex ?? navigationIndex.current : navigationIndex.current
    const next = currentIndex + offset
    if (next < 0 || next >= material.sentences.length) return
    selectSentence(next)
  }
  const repeat = () => {
    const enabled = !repeatThree
    setRepeatThree(enabled)
    const live = player.getSnapshot()
    if (canPlay && live.mode === 'continuous' && (live.status === 'playing' || live.status === 'waiting' || live.status === 'paused')) {
      player.playAll(material.sentences.map(sentence => sentence.text), settings,
        live.sentenceIndex ?? material.currentIndex, enabled ? 3 : 1, live.status === 'paused')
    }
  }
  const previewVoice = () => {
    if (previewActive) player.stop()
    else if (natural && selectedVoice) {
      const sample = "Today, we'll examine how changes in the environment influence the way animals behave."
      if (naturalReady) player.play(material.sentences[material.currentIndex].text, settings)
      else speechPort.prepareNatural([sample], selectedVoice.voiceURI, () => player.play(sample, settings))
    }
    else if (canPlay) player.play(material.language.startsWith('en')
      ? "Today, we'll examine how changes in the environment influence the way animals behave."
      : '今日は、環境の変化が動物の行動に与える影響を考えます。', settings)
  }
  const changeSettings = (patch: Partial<Preferences>) => {
    updatePreferences(patch)
    if (patch.voiceURI !== undefined) player.stop()
    else player.reconfigure({ ...settings, ...patch })
  }
  const changeFocus = (next: boolean) => {
    if (next) focusScroll.current = window.scrollY
    setFocused(next)
    setSettingsOpen(false)
    requestAnimationFrame(() => {
      window.scrollTo({ top: next ? 0 : focusScroll.current, behavior: 'instant' })
      focusButton.current?.focus({ preventScroll: true })
    })
  }
  const lookupSelectedText = () => {
    const input = dictationInput.current
    const text = input?.value.slice(input.selectionStart, input.selectionEnd).trim()
    if (!text) { setNotice('先在听写框里选中文字，或直接在旁边输入单词、短语或句子。'); return }
    if (text.length > DICTIONARY_QUERY_LIMIT) { setNotice(`最多查询 ${DICTIONARY_QUERY_LIMIT} 个字符，请选中较短的句子。`); return }
    setLookupSelection({ text, nonce: Date.now() })
  }
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (!practiceRoute || accountOpen) return
      if (event.key === 'Escape' && document.querySelector('.color-theme-dialog[open]')) return
      if (event.key === 'Escape' && settingsOpen && !importMode && !event.defaultPrevented) {
        event.preventDefault(); setSettingsOpen(false); return
      }
      if (event.key === 'Escape' && focused && !importMode && !event.defaultPrevented) {
        event.preventDefault(); changeFocus(false); return
      }
      if (!event.altKey || event.ctrlKey || event.metaKey || event.shiftKey || event.isComposing
        || event.repeat || importMode || !['j', 'k', 'l', 'r'].includes(event.key.toLowerCase())) return
      event.preventDefault()
      switch (event.key.toLowerCase()) {
        case 'j': jump(-1); break
        case 'k': play(); break
        case 'l': jump(1); break
        case 'r': repeat(); break
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const saveMaterial = (next: Material) => {
    if (importMode !== 'edit' && workspace.materials.length >= 100) {
      setNotice('本次材料已达 100 篇。刷新页面后可重新开始。'); return
    }
    player.stop()
    setWorkspace(previous => ({ ...previous, activeId: next.id,
      materials: importMode === 'edit' ? previous.materials.map(item => item.id === next.id ? next : item) : [...previous.materials, next] }))
    setImportMode(null)
    checkedSentences.current.delete(next.id); setCheck(null); setCheckError('')
    if (next.language !== sessionLanguage) window.location.hash = next.language === 'ja-JP' ? '/practice/ja' : '/practice/en'
    setNotice(importMode === 'edit' ? '已更新材料，保留了听写内容。' : `已导入 ${next.sentences.length} 句，选择声音后就能开始。`)
    requestAnimationFrame(() => practiceArea.current?.scrollIntoView({ block: 'start', behavior: 'instant' }))
  }
  const openImport = () => { player.stop(); setImportMode('new') }
  const checkCurrent = () => {
    setCheckError('')
    if (!answer.trim()) { setCheckError('先写下你听到的内容，再检查。'); return }
    try {
      const result = checkAnswer(material.sentences[material.currentIndex].text, answer, material.language)
      setCheck(result)
      const indices = checkedSentences.current.get(material.id) ?? new Set<number>()
      indices.add(material.currentIndex); checkedSentences.current.set(material.id, indices)
      void learning.record(material.currentIndex, result, indices.size === material.sentences.length)
    } catch (error) { setCheckError(error instanceof Error ? error.message : '检查未完成。') }
  }
  const statusText = playback.status === 'paused' ? continuousPlayback ? '连播已暂停' : '已暂停'
    : playback.status === 'waiting' ? continuousPlayback ? '正在切换下一句' : '句间停顿'
    : playback.status === 'playing' ? continuousPlayback ? '全文连播中' : '正在朗读'
    : playback.status === 'error' ? '朗读中断' : '待播放'
  const wordCount = answer.trim() ? answer.trim().split(/\s+/).length : 0
  const showCurrent = !preferences.transcriptHidden || peek

  return <div className={`app-shell${focused ? ' is-focused' : ''}${settingsOpen ? ' has-settings' : ''}`} style={{
    '--practice-font-size': `${readingSize}px`, '--transcript-width': `${transcriptWidth}%`,
  } as CSSProperties}>
    <svg className="character-color-defs" aria-hidden="true" width="0" height="0"><defs><filter id="character-tone-map" colorInterpolationFilters="sRGB"><feColorMatrix type="saturate" values="0" /><feComponentTransfer><feFuncR type="table" tableValues={channels[0]} /><feFuncG type="table" tableValues={channels[1]} /><feFuncB type="table" tableValues={channels[2]} /></feComponentTransfer></filter></defs></svg>
    <header className="app-header">
      <a className="brand" href="#/" aria-label={route === 'home' ? '听写练习台' : '返回首页'} title="返回首页" onClick={() => window.scrollTo({ top: 0, behavior: 'instant' })}><span className="brand-mark"><Icon name="headphones" size={24} /></span>
        <span>听写练习台</span></a>
      <div className="header-actions">
        <a className="dashboard-link" href="#/dashboard">学习面板</a>
        {account.user ? <button className="text-button account-control" onClick={() => { void learning.flush().then(account.logout).catch(() => setNotice('退出未完成，请检查网络重试。')) }}>退出登录</button> : <button className="text-button account-control" onClick={() => setAccountOpen(true)} disabled={account.loading}>{account.loading ? '连接账号…' : '邮箱登录'}</button>}
        <ThemePicker value={preferences.colorTheme} onChange={colorTheme => updatePreferences({ colorTheme })} />
        {practiceRoute && <>
          <nav className="language-tabs" aria-label="练习语言"><a href="#/practice/en" aria-current={route === 'en' ? 'page' : undefined}>英语</a><a href="#/practice/ja" aria-current={route === 'ja' ? 'page' : undefined}>日语</a></nav>
        </>}
        <button className="theme-toggle" type="button" aria-pressed={preferences.theme === 'dark'}
          aria-label={preferences.theme === 'dark' ? '切换日间模式' : '切换深夜模式'}
          title={preferences.theme === 'dark' ? '切换到日间模式' : '切换到深夜模式'}
          onClick={() => updatePreferences({ theme: preferences.theme === 'dark' ? 'light' : 'dark' })}>
          <Icon name={preferences.theme === 'dark' ? 'sun' : 'moon'} size={17} />
          <span className="theme-label">{preferences.theme === 'dark' ? '日间模式' : '深夜模式'}</span>
        </button>
        {practiceRoute && <button className="secondary-button" onClick={openImport}><Icon name="plus" />导入材料</button>}
      </div>
    </header>

    {route === 'home' ? <HomePage /> : route === 'dashboard' ? <LearningDashboard user={account.user} sessions={learning.sessions} loading={learning.loading} error={learning.error || account.error} onLogin={() => setAccountOpen(true)} onRefresh={() => { void learning.flush().then(learning.refresh) }} /> : <main className="practice-page">
      <div className="training-area" id="practice-area" ref={practiceArea}>
      <section className="material-heading training-heading" aria-label="当前练习材料">
        <div><h2>{material.title}</h2></div>
        <div className="training-actions">
        {focused && <ThemePicker value={preferences.colorTheme} onChange={colorTheme => updatePreferences({ colorTheme })} />}
        {sessionMaterials.length > 1 && <label className="material-picker"><span className="sr-only">切换材料</span><select value={material.id} onChange={event => {
          player.stop(); setWorkspace(previous => ({ ...previous, activeId: event.target.value }))
        }}>{sessionMaterials.map(item => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label>}
        {focused && <button className="theme-toggle" type="button" aria-pressed={preferences.theme === 'dark'}
          aria-label={preferences.theme === 'dark' ? '切换日间模式' : '切换深夜模式'}
          onClick={() => updatePreferences({ theme: preferences.theme === 'dark' ? 'light' : 'dark' })}>
          <Icon name={preferences.theme === 'dark' ? 'sun' : 'moon'} size={17} /><span>{preferences.theme === 'dark' ? '日间模式' : '深夜模式'}</span></button>}
        <button className="settings-toggle" type="button" aria-expanded={settingsOpen} aria-controls="practice-settings" onClick={() => setSettingsOpen(value => !value)}><Icon name="settings" size={18} />设置</button>
        <button ref={focusButton} className="focus-toggle" type="button" aria-pressed={focused}
          aria-label={focused ? '退出专注' : '专注练习'} onClick={() => changeFocus(!focused)}>
          <Icon name={focused ? 'minimize' : 'focus'} size={17} />{focused ? '退出专注' : '专注'}</button>
        </div>
      </section>
      <section className="settings-panel" id="practice-settings" hidden={!settingsOpen} aria-label="练习设置">
        <div className="settings-fields">
          <label>字号<select aria-label="阅读字号" value={readingSize} onChange={event => setReadingSize(Number(event.target.value))}>
            {[16, 18, 20, 22].map(size => <option key={size} value={size}>{size}</option>)}</select></label>
          <label>双栏<select aria-label="原文与听写栏宽" value={transcriptWidth} onChange={event => setTranscriptWidth(Number(event.target.value))}>
            <option value={50}>均分</option><option value={60}>原文较宽</option><option value={40}>听写较宽</option></select></label>
          <button className="text-button" onClick={() => { player.stop(); setImportMode('edit') }}><Icon name="edit" size={16} />调整断句</button>
          {focused && <button className="text-button" onClick={openImport}><Icon name="plus" size={16} />更换材料</button>}
        </div>
        <details className="keyboard-help"><summary>快捷键与说明</summary>
          <p><kbd>Esc</kbd> 关闭设置 / 退出专注。常用播放快捷键显示在播放器下方。</p>
          <p>选中听写中的单词，点击听写栏的放大镜即可查词。</p>
          <p>本句输入：{material.language.startsWith('en') ? `${wordCount} 词` : `${answer.length} 字符`}。切句保留各句输入，刷新后清空。登录后仅保存标题和学习统计。</p>
        </details>
      </section>
      {(!supported || (voiceChecked && !selectedVoice)) && <div className="alert warning" role="status">
        {!supported ? '当前浏览器不支持朗读，请使用新版 Edge 或 Chrome。'
          : languageVoices.length === 0 ? '还没有找到这门语言的声音。请刷新声音列表，或在 Windows 的“语音”设置中添加对应语言的声音。'
          : '没有可自动选择的本地声音。可以手动选择一个在线声音，文字将交由该声音提供方朗读。'}
        {supported && languageVoices.length === 0 && <div className="voice-setup-help">
          <a href="ms-settings:speech">打开 Windows 语音设置</a>
          <span>在“管理语音 / 添加语音”中安装{material.language.startsWith('en') ? '英语（美国）' : '日语'}，安装后重新打开浏览器，再刷新声音。</span>
        </div>}
      </div>}

      <div className="training-layout">
      <section className="practice-desk" aria-label="精听练习区">
        <div className="player-bar">
          <div className="transport">
            <button className="transport-button" onMouseDown={event => event.preventDefault()} onClick={() => jump(-1)}
              disabled={material.currentIndex === 0} aria-label="上一句" title="上一句 Alt+J"><Icon name="previous" size={20} /><span>上一句</span></button>
            <button className="play-button" onMouseDown={event => event.preventDefault()} onClick={play} disabled={!selectedVoice || !supported || natural && preparation.status === 'loading'}
              aria-label={natural && !naturalReady ? '准备自然语音' : previewActive ? '播放' : inProgress ? '暂停' : playback.status === 'paused' ? '继续播放' : '播放'} title="播放 / 暂停 Alt+K">
              <Icon name={!previewActive && inProgress ? 'pause' : 'play'} size={20} />{natural && !naturalReady ? preparation.status === 'loading' ? '准备中' : '准备语音' : previewActive ? '播放' : inProgress ? '暂停' : playback.status === 'paused' ? '继续' : '播放'}</button>
            <button className="transport-button" onMouseDown={event => event.preventDefault()} onClick={() => jump(1)}
              disabled={material.currentIndex === material.sentences.length - 1} aria-label="下一句" title="下一句 Alt+L"><span>下一句</span><Icon name="next" size={20} /></button>
            <span className="sentence-progress" aria-label={`第 ${material.currentIndex + 1} / ${material.sentences.length} 句`}>{material.currentIndex + 1} / {material.sentences.length}</span>
          </div>
          <div className="playback-options">
            <button className={`repeat-button ${repeatThree ? 'active' : ''}`}
              onMouseDown={event => event.preventDefault()} onClick={repeat} disabled={!canPlay} aria-pressed={repeatThree} aria-label="重复 3 次" title="每句播放三遍后自动下一句；再次点击关闭 Alt+R"><Icon name="repeat" />重复 3 次{repeatThree && playback.total === 3 && playback.status !== 'idle' && <span className="repeat-progress">{playback.iteration}/3</span>}</button>
            <label className="rate-picker"><span className="sr-only">语速</span><select aria-label="语速" value={preferences.rate}
              onChange={event => changeSettings({ rate: Number(event.target.value) })}>{RATES.map(rate => <option key={rate} value={rate}>{rate}×</option>)}</select></label>
            <button className="stop-button" onClick={() => player.stop()} disabled={!inProgress && playback.status !== 'paused'} aria-label="停止朗读" title="停止朗读"><Icon name="stop" size={16} /></button>
          </div>
        </div>
        <div className="playback-status sr-only" aria-live="polite">{statusText}
          {playback.total === 3 && playback.iteration > 0 && <span className="repeat-count">第 {playback.iteration} / 3 遍</span>}
          <span className="sentence-count">第 {material.currentIndex + 1} / {material.sentences.length} 句</span>
        </div>
        {playback.error && <div className="alert error" role="alert">{playback.error}</div>}

        <div className="workspace-panels">
          <section className="transcript-panel" aria-labelledby="transcript-title">
            <div className="panel-heading"><h2 id="transcript-title">听力原文</h2><div className="panel-actions">
              {preferences.transcriptHidden && <button className="text-button" onClick={() => setPeek(value => !value)}>{peek ? '收起当前句' : '查看当前句'}</button>}
              <button className="panel-icon-button" aria-label={preferences.transcriptHidden ? '显示原文' : '隐藏原文'} title={preferences.transcriptHidden ? '显示原文' : '隐藏原文'} onClick={() => { updatePreferences({ transcriptHidden: !preferences.transcriptHidden }); setPeek(false) }}>
                <Icon name={preferences.transcriptHidden ? 'eye' : 'hide'} size={18} /></button></div></div>
            <div className="sentence-list" aria-label="句子列表">
              {material.sentences.map((sentence, index) => <button key={sentence.id} ref={index === material.currentIndex ? currentRow : undefined}
                className={`sentence-row ${index === material.currentIndex ? 'selected' : ''}`} aria-current={index === material.currentIndex ? 'step' : undefined}
                aria-label={preferences.transcriptHidden && !(peek && index === material.currentIndex) ? `第 ${index + 1} 句，原文已隐藏` : undefined}
                onMouseDown={event => event.preventDefault()} onClick={() => selectSentence(index)}>
                <span className="sentence-number">{String(index + 1).padStart(2, '0')}</span>
                <span className={preferences.transcriptHidden && !(peek && index === material.currentIndex) ? 'hidden-sentence' : 'sentence-text'}>
                  {preferences.transcriptHidden && !(peek && index === material.currentIndex) ? '原文已隐藏' : sentence.text}</span>
                {index === material.currentIndex && <span className="selected-indicator" aria-hidden="true"><i /><i /><i /></span>}
              </button>)}
            </div>
          </section>

          <section className="dictation-panel" aria-labelledby="dictation-title">
            <div className="panel-heading"><h2 id="dictation-title">我的听写</h2>
              <button className="panel-icon-button" aria-label="选词查词" onMouseDown={event => event.preventDefault()} onClick={lookupSelectedText} title="查询选中的单词"><Icon name="search" size={18} /></button></div>
            <div className="dictation-body"><label className="sr-only" htmlFor="dictation-input">我的听写内容</label>
              <textarea ref={dictationInput} id="dictation-input" className="dictation-input" value={answer} maxLength={100_000}
                spellCheck={false} autoComplete="off" autoCorrect="off" autoCapitalize="off"
                placeholder="输入当前句听写内容"
                onChange={event => { learning.touch(); setCheck(null); updateMaterial(material.id, { draftText: event.target.value, answers: { ...material.answers, [material.sentences[material.currentIndex].id]: event.target.value } }) }} />
              <div className="answer-actions"><button className="secondary-button" onClick={checkCurrent}>检查本句</button><span role="status">{account.user ? learning.status === 'saving' ? '保存中…' : learning.status === 'saved' ? '学习记录已同步' : '登录后记录本次练习' : '游客练习 · 不保存统计'}</span></div>
              {checkError && <p className="check-error" role="alert">{checkError}</p>}
              {check && <div className="answer-feedback" role="status"><strong>写对 {check.correct} / {check.total}{material.language.startsWith('ja') ? ' 字符' : ' 词'}{check.extra > 0 && ` · 多写或未匹配 ${check.extra} 项`}</strong><div>{check.words.map((word, i) => <span key={i} className={word.correct ? 'answer-correct' : 'answer-missed'}>{word.text}{material.language.startsWith('en') ? ' ' : ''}</span>)}</div><small>标记处尚未匹配；忽略大小写与标点。{material.language.startsWith('ja') && '日语按字符检查，每正确字符计1分。'}</small></div>}
              {learning.error && <p className="check-error" role="alert">{learning.error}<button className="text-button" onClick={() => void learning.flush()}>重试同步</button></p>}
            </div>
          </section>
        </div>
        <div className="practice-hotkeys" aria-label="键盘操作">
          <span><kbd>Alt</kbd> + <kbd>K</kbd> 播放 / 暂停</span><span><kbd>Alt</kbd> + <kbd>J</kbd> 上一句</span><span><kbd>Alt</kbd> + <kbd>L</kbd> 下一句</span><span><kbd>Alt</kbd> + <kbd>R</kbd> 重复</span>
        </div>
      </section>
      <div className="workspace-side">
        <DictionaryPanel selection={lookupSelection} language={sessionLanguage} />
        <section className="voice-card" aria-labelledby="voice-card-title">
          <div className="voice-card-heading"><h3 id="voice-card-title">朗读声音</h3><div className="voice-card-actions"><button className="text-button" disabled={!selectedVoice || (natural && preparation.status === 'loading')} onClick={previewVoice} aria-label={previewActive ? '停止试听' : '试听声音'}><Icon name={previewActive ? 'stop' : 'play'} size={14} />{previewActive ? '停止' : '试听'}</button><button className="panel-icon-button" aria-label="刷新声音" title="刷新声音" onClick={() => { refreshVoices(); setVoiceChecked(true) }}><Icon name="repeat" size={17} /></button></div></div>
          <label className="voice-picker"><span className="sr-only">声音</span><select aria-label="朗读声音" value={selectedVoice?.voiceURI ?? ''} onChange={event => { manualVoices.current.set(material.language, event.target.value); changeSettings({ voiceURI: event.target.value }) }}>
            <option value="">{languageVoices.length ? '请选择声音' : voiceChecked ? '未找到对应语言的声音' : '正在查找声音…'}</option>
            {languageVoices.map(voice => <option key={voice.voiceURI} value={voice.voiceURI} title={naturalVoiceId(voice.voiceURI) ? 'Kokoro · 本机生成 · 与参考站相同音色系列' : voiceDescription(voice)}>{naturalVoiceId(voice.voiceURI) ? voice.name : `${voiceLabel(voice)} · ${isNaturalVoice(voice) ? `自然 · ${voice.localService ? '本地' : '在线'}` : voice.localService ? '系统本地' : '在线'}`}</option>)}
          </select></label>
          {natural && <div className="natural-preparation"><p>{naturalReady ? '本篇音频已就绪，切句直接播放。' : preparation.status === 'loading' ? `正在准备 ${preparation.done} / ${preparation.total} 句${preparation.generating ? ' · 本机合成中' : ` · 资源下载 ${preparation.percent}%`}` : '先准备本篇音频，完成后开始练习。首次需下载约 100 MB，建议使用 Wi-Fi；后续尽量复用浏览器缓存。'}</p>
            {preparation.status === 'loading' ? <><progress aria-label="自然语音准备进度" max={preparation.total || 1} value={preparation.done} /><button className="text-button" onClick={() => speechPort.cancelPreparation()}>取消准备</button></> : !naturalReady && <button className="secondary-button" onClick={() => { player.stop(); speechPort.prepareNatural(material.sentences.map(s => s.text), selectedVoice!.voiceURI) }}>准备本篇自然语音</button>}
            {preparation.status === 'error' && <p className="check-error" role="alert">{preparation.error}</p>}</div>}
          {audioStatus === 'loading' && <p className="voice-availability" role="status">正在准备这句音频，完成后自动播放…</p>}
          {audioStatus === 'fallback' && <p className="voice-availability" role="status">音频缓存连接暂不可用，已使用原在线朗读，切句可能稍有等待。</p>}
        </section>
      </div>
      </div>
      </div>
    </main>}
    {notice && <div className="toast" role="status">{notice}<button aria-label="关闭提示" onClick={() => setNotice('')}><Icon name="close" size={16} /></button></div>}
    {importMode && <ImportDialog material={importMode === 'edit' ? material : undefined}
      initialLanguage={sessionLanguage}
      onClose={() => setImportMode(null)} onSave={saveMaterial} />}
    {accountOpen && <AccountDialog recovery={account.recovery} onRecovered={account.finishRecovery} onClose={() => setAccountOpen(false)} />}
    {/* Hidden text must be absent from the rendered transcript, not merely blurred. */}
    {route !== 'home' && !showCurrent && <span className="sr-only">当前句内容已隐藏。</span>}
  </div>
}
