export type PlaybackStatus = 'idle' | 'playing' | 'waiting' | 'paused' | 'error'
export interface SpeechSettings { language: string; voiceURI: string; rate: number }
export interface PlaybackState {
  status: PlaybackStatus
  mode: 'single' | 'continuous'
  sentenceIndex: number | null
  iteration: number
  total: number
  error: string | null
}
export interface SpeechPort {
  speak(text: string, settings: SpeechSettings, onEnd: () => void, onError: (message: string) => void): void
  pause(): void
  resume(): void
  cancel(): void
}
export interface Clock {
  schedule(callback: () => void, delay: number): unknown
  clear(handle: unknown): void
}
const realClock: Clock = {
  schedule: (callback, delay) => setTimeout(callback, delay),
  clear: handle => clearTimeout(handle as ReturnType<typeof setTimeout>),
}

type SpeechTask = { settings: SpeechSettings; total: number } & (
  { mode: 'single'; text: string }
  | { mode: 'continuous'; sentences: string[]; index: number }
)
type Advance = 'repeat' | 'next'

/** One owner for speech and timers. A generation invalidates callbacks from cancelled audio. */
export class SpeechPlayer {
  private port: SpeechPort
  private clock: Clock
  private state: PlaybackState = { status: 'idle', mode: 'single', sentenceIndex: null, iteration: 0, total: 1, error: null }
  private listeners = new Set<() => void>()
  private generation = 0
  private timer: unknown = null
  private waitTicket = 0
  private task: SpeechTask | null = null
  private pendingAdvance: Advance | null = null
  private pausedFrom: 'playing' | 'waiting' | 'restart' = 'playing'

  constructor(port: SpeechPort, clock: Clock = realClock) {
    this.port = port
    this.clock = clock
  }

  getSnapshot = (): PlaybackState => this.state
  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }
  private publish(patch: Partial<PlaybackState>) {
    this.state = { ...this.state, ...patch }
    this.listeners.forEach(listener => listener())
  }
  private clearTimer() {
    this.waitTicket++
    if (this.timer !== null) this.clock.clear(this.timer)
    this.timer = null
  }
  private invalidate() {
    this.generation++
    this.clearTimer()
    this.pendingAdvance = null
    this.port.cancel()
  }
  stop() {
    this.invalidate()
    this.task = null
    this.publish({ status: 'idle', mode: 'single', sentenceIndex: null, iteration: 0, total: 1, error: null })
  }
  play(text: string, settings: SpeechSettings, total = 1) {
    if (!text.trim()) { this.stop(); return }
    this.invalidate()
    this.task = { mode: 'single', text, settings: { ...settings }, total }
    this.publish({ status: 'playing', mode: 'single', sentenceIndex: null, iteration: 1, total, error: null })
    this.speak(this.generation)
  }
  playAll(sentences: readonly string[], settings: SpeechSettings, startIndex = 0, total = 1, startPaused = false) {
    if (!sentences.length || !Number.isInteger(startIndex) || startIndex < 0 || startIndex >= sentences.length
      || sentences.some(text => typeof text !== 'string' || !text.trim())) {
      this.stop()
      return
    }
    this.invalidate()
    this.task = { mode: 'continuous', sentences: [...sentences], index: startIndex, settings: { ...settings }, total }
    this.pausedFrom = 'restart'
    this.publish({ status: startPaused ? 'paused' : 'playing', mode: 'continuous', sentenceIndex: startIndex, iteration: 1, total, error: null })
    if (!startPaused) this.speak(this.generation)
  }
  private speak(generation: number) {
    if (!this.task || generation !== this.generation) return
    this.publish({ status: 'playing' })
    try {
      let settled = false
      const text = this.task.mode === 'continuous' ? this.task.sentences[this.task.index] : this.task.text
      this.port.speak(text, this.task.settings, () => {
        if (generation !== this.generation || settled || !this.task) return
        settled = true
        const advance: Advance | null = this.state.iteration < this.task.total ? 'repeat'
          : this.task.mode === 'continuous' && this.task.index < this.task.sentences.length - 1 ? 'next' : null
        if (advance) {
          // Some engines deliver end while paused at the very end of a sentence.
          if (this.state.status === 'paused') {
            this.pausedFrom = 'waiting'
            this.pendingAdvance = advance
          } else this.wait(generation, advance)
        } else {
          this.task = null
          this.pendingAdvance = null
          this.publish({ status: 'idle' })
        }
      }, message => {
        if (generation !== this.generation || settled) return
        settled = true
        this.fail(message)
      })
    } catch {
      this.fail('朗读未能启动，请重新选择声音后再试。')
    }
  }
  private fail(message: string) {
    this.generation++
    this.clearTimer()
    this.pendingAdvance = null
    this.task = null
    this.publish({ status: 'error', error: message })
  }
  private wait(generation: number, advance: Advance) {
    this.clearTimer()
    const ticket = this.waitTicket
    this.pendingAdvance = advance
    this.publish({ status: 'waiting' })
    if (generation !== this.generation || ticket !== this.waitTicket || this.state.status !== 'waiting') return
    this.timer = this.clock.schedule(() => {
      if (generation !== this.generation || ticket !== this.waitTicket || this.state.status !== 'waiting' || !this.task) return
      this.timer = null
      this.pendingAdvance = null
      if (advance === 'next' && this.task.mode === 'continuous') {
        this.task.index++
        this.publish({ sentenceIndex: this.task.index, iteration: 1 })
      } else this.publish({ iteration: this.state.iteration + 1 })
      this.speak(generation)
    }, advance === 'next' ? 120 : 180)
  }
  pause() {
    if (this.state.status === 'playing') {
      this.pausedFrom = 'playing'
      // Publish before asking the engine to pause; it may synchronously report end.
      this.publish({ status: 'paused' })
      this.port.pause()
    } else if (this.state.status === 'waiting') {
      this.pausedFrom = 'waiting'
      this.clearTimer()
      this.publish({ status: 'paused' })
    }
  }
  resume() {
    if (this.state.status !== 'paused' || !this.task) return
    if (this.pausedFrom === 'waiting' && this.pendingAdvance) this.wait(this.generation, this.pendingAdvance)
    else if (this.pausedFrom === 'restart') this.speak(this.generation)
    else {
      this.publish({ status: 'playing' })
      this.port.resume()
    }
  }
  reconfigure(settings: SpeechSettings) {
    if (!this.task) return
    const task = this.task
    if (this.state.status === 'paused') {
      this.invalidate()
      this.task = { ...task, settings: { ...settings } }
      this.pausedFrom = 'restart'
      this.publish({ status: 'paused', iteration: 1, error: null })
    } else if (task.mode === 'continuous') this.playAll(task.sentences, settings, task.index, task.total)
    else this.play(task.text, settings, task.total)
  }
}

export class BrowserSpeechPort implements SpeechPort {
  // Retain the utterance until it ends (some browser engines otherwise lose events).
  private utterance: SpeechSynthesisUtterance | null = null
  private prepared = new Map<string, SpeechSynthesisUtterance[]>()
  private preparedSettings = ''
  private voice: SpeechSynthesisVoice | undefined
  private startTimer: ReturnType<typeof setTimeout> | undefined
  private clearStartTimer() { clearTimeout(this.startTimer); this.startTimer = undefined }
  private settingsKey(settings: SpeechSettings) { return JSON.stringify([settings.language, settings.voiceURI, settings.rate]) }
  private createUtterance(text: string, settings: SpeechSettings, voice: SpeechSynthesisVoice) {
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = settings.language
    utterance.voice = voice
    utterance.rate = settings.rate
    return utterance
  }
  prepare(texts: readonly string[], settings: SpeechSettings, voice: SpeechSynthesisVoice) {
    if (!('speechSynthesis' in window)) return
    const key = this.settingsKey(settings)
    if (key !== this.preparedSettings) { this.prepared.clear(); this.preparedSettings = key }
    this.voice = voice
    for (const text of this.prepared.keys()) if (!texts.includes(text)) this.prepared.delete(text)
    for (const text of texts) {
      const queue = this.prepared.get(text) ?? []
      while (queue.length < 3) queue.push(this.createUtterance(text, settings, voice))
      this.prepared.set(text, queue)
    }
  }
  speak(text: string, settings: SpeechSettings, onEnd: () => void, onError: (message: string) => void) {
    if (!('speechSynthesis' in window)) {
      onError('当前浏览器不支持朗读，请用新版 Edge 或 Chrome 打开。')
      return
    }
    const synth = window.speechSynthesis
    const key = this.settingsKey(settings)
    const prepared = key === this.preparedSettings
    const voice = prepared ? this.voice : synth.getVoices().find(item => item.voiceURI === settings.voiceURI)
    if (!voice) { onError('所选声音暂不可用，请刷新声音列表后重新选择。'); return }
    const utterance = (prepared ? this.prepared.get(text)?.shift() : undefined) ?? this.createUtterance(text, settings, voice)
    const launch = (item: SpeechSynthesisUtterance, retry: boolean) => {
      this.clearStartTimer()
      this.utterance = item
      let started = false
      item.onstart = () => { if (this.utterance === item) { started = true; this.clearStartTimer() } }
      item.onend = () => {
        if (this.utterance !== item) return
        this.clearStartTimer(); this.utterance = null; onEnd()
      }
      item.onerror = event => {
        if (this.utterance !== item) return
        this.clearStartTimer(); this.utterance = null
        onError(event.error === 'not-allowed' ? '浏览器阻止了朗读，请点击播放按钮重试。'
          : '朗读中断了，请检查所选声音是否可用；在线声音还需要网络连接。')
      }
      if (synth.paused) synth.resume()
      synth.speak(item)
      // Windows Chromium can accept an utterance but leave it stuck in its
      // native queue. Retry once only if no start event arrives. A normal
      // utterance is never restarted, and cancellation invalidates this timer.
      if (!started && voice.localService && typeof item.addEventListener === 'function' && /Windows/.test(navigator.userAgent)) {
        this.startTimer = setTimeout(() => {
          if (this.utterance !== item || started || document.hidden || synth.paused) return
          if (retry) { this.cancel(); onError('系统声音没有及时启动，请点击播放重试。'); return }
          item.onstart = null; item.onend = null; item.onerror = null
          this.utterance = null
          synth.cancel()
          launch(this.createUtterance(text, settings, voice), true)
        }, retry ? 2000 : 800)
      }
    }
    launch(utterance, false)
  }
  pause() { this.clearStartTimer(); window.speechSynthesis?.pause() }
  resume() { window.speechSynthesis?.resume() }
  cancel() {
    this.clearStartTimer()
    const synth = window.speechSynthesis
    const active = !!this.utterance || synth?.speaking || synth?.pending || synth?.paused
    if (this.utterance) {
      this.utterance.onend = null
      this.utterance.onerror = null
      this.utterance.onstart = null
    }
    if (active) synth?.cancel()
    this.utterance = null
  }
}
