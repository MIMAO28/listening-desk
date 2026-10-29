import { CachedSpeechPort } from './cachedSpeechPort.ts'
import { naturalVoiceId } from './naturalVoices.ts'
import type { SpeechPort, SpeechSettings } from './speechPlayer.ts'

export interface Preparation { status: 'idle' | 'loading' | 'ready' | 'error'; done: number; total: number; percent: number; generating: boolean; error: string }
export class PracticeSpeechPort implements SpeechPort {
  private legacy = new CachedSpeechPort()
  private listeners = new Set<() => void>()
  private preparation: Preparation = { status: 'idle', done: 0, total: 0, percent: 0, generating: false, error: '' }
  private worker: Worker | undefined
  private buffers = new Map<string, AudioBuffer>()
  private context: AudioContext | undefined
  private source: AudioBufferSourceNode | undefined
  private buffer: AudioBuffer | undefined
  private job = 0
  private activeNatural = false
  private paused = false
  private offset = 0
  private started = 0
  private rate = 1
  private onEnd: (() => void) | undefined
  private ticket = 0
  private bytes = 0
  constructor() { this.legacy.subscribe(() => this.listeners.forEach(fn => fn())) }
  subscribe = (fn: () => void) => { this.listeners.add(fn); return () => this.listeners.delete(fn) }
  getSnapshot = () => this.legacy.getSnapshot()
  getPreparation = () => this.preparation
  private publish(patch: Partial<Preparation>) { this.preparation = { ...this.preparation, ...patch }; this.listeners.forEach(fn => fn()) }
  prepare(texts: readonly string[], settings: SpeechSettings, voice: SpeechSynthesisVoice) {
    if (!naturalVoiceId(settings.voiceURI)) this.legacy.prepare(texts, settings, voice)
  }
  isReady(texts: readonly string[], uri: string) {
    return texts.length > 0 && texts.every(t => this.buffers.has(JSON.stringify([uri, t])))
  }
  cancelPreparation() {
    this.job++; this.worker?.postMessage({ cancel: true, job: this.job })
    this.publish({ status: 'idle', done: 0, total: 0, percent: 0, generating: false, error: '' })
  }
  prepareNatural(texts: readonly string[], uri: string, onReady?: () => void) {
    const voice = naturalVoiceId(uri)
    if (!voice) return
    this.cancel(); this.cancelPreparation()
    this.context ??= new AudioContext()
    void this.context.resume().catch(() => {})
    const unique = [...new Set(texts)]
    const missing = unique.filter(text => !this.buffers.has(JSON.stringify([uri, text])))
    const protectedKeys = new Set(unique.map(text => JSON.stringify([uri, text])))
    this.publish({ status: missing.length ? 'loading' : 'ready', done: unique.length - missing.length, total: unique.length, percent: missing.length ? 0 : 100, error: '' })
    if (!missing.length) { onReady?.(); return }
    const job = this.job
    const fail = () => {
      this.worker?.terminate(); this.worker = undefined; this.buffers.clear(); this.bytes = 0
      this.publish({ status: 'error', error: '自然语音准备未完成。请重试；长文章可拆成几篇。' })
    }
    this.worker ??= new Worker(new URL('./kokoro.worker.ts', import.meta.url), { type: 'module' })
    this.worker.onerror = fail
    this.worker.onmessage = ({ data }) => {
      if (data.job !== this.job) return
      if (data.kind === 'download') this.publish({ percent: Math.round(data.percent) })
      if (data.kind === 'model-ready') this.publish({ generating: true })
      if (data.kind === 'sentence') {
        while (this.bytes + data.samples.byteLength > 96 * 1024 * 1024) {
          const disposable = [...this.buffers.keys()].find(key => !protectedKeys.has(key))
          if (!disposable) { fail(); return }
          this.bytes -= this.buffers.get(disposable)!.length * 4; this.buffers.delete(disposable)
        }
        this.bytes += data.samples.byteLength
        const audio = this.context!.createBuffer(1, data.samples.length, data.rate)
        audio.copyToChannel(data.samples, 0)
        this.buffers.set(JSON.stringify([uri, missing[data.index]]), audio)
        this.publish({ done: unique.length - missing.length + data.index + 1 })
      }
      if (data.kind === 'done') {
        this.publish({ status: 'ready', percent: 100 })
        onReady?.()
      }
      if (data.kind === 'error') fail()
    }
    this.worker.postMessage({ job, texts: missing, voice })
  }
  speak(text: string, settings: SpeechSettings, onEnd: () => void, onError: (message: string) => void) {
    if (!naturalVoiceId(settings.voiceURI)) { this.activeNatural = false; this.legacy.speak(text, settings, onEnd, onError); return }
    const buffer = this.buffers.get(JSON.stringify([settings.voiceURI, text]))
    if (!buffer) { onError('请先准备本篇自然语音，完成后切句可直接播放。'); return }
    this.activeNatural = true; this.buffer = buffer; this.offset = 0; this.rate = settings.rate; this.paused = false; this.onEnd = onEnd
    const ticket = ++this.ticket
    if (this.context!.state === 'running') this.start(ticket)
    else void this.context!.resume().then(() => this.start(ticket)).catch(() => onError('请点击播放以启用音频。'))
  }
  private start(ticket: number) {
    if (ticket !== this.ticket || this.paused || !this.context || !this.buffer || this.source) return
    const source = this.context.createBufferSource()
    source.buffer = this.buffer; source.playbackRate.value = this.rate; source.connect(this.context.destination)
    this.source = source; this.started = this.context.currentTime
    source.onended = () => {
      if (this.source !== source || ticket !== this.ticket) return
      source.disconnect(); this.source = undefined; this.buffer = undefined; this.onEnd?.()
    }
    source.start(0, Math.min(this.offset, this.buffer.duration))
  }
  private clearSource() {
    if (!this.source) return
    this.source.onended = null; this.source.stop(); this.source.disconnect(); this.source = undefined
  }
  pause() {
    if (!this.activeNatural) { this.legacy.pause(); return }
    this.paused = true
    if (this.source && this.context) this.offset += (this.context.currentTime - this.started) * this.rate
    this.clearSource()
  }
  resume() {
    if (!this.activeNatural) { this.legacy.resume(); return }
    this.paused = false
    void this.context?.resume().then(() => this.start(this.ticket))
  }
  cancel() {
    this.ticket++; this.clearSource(); this.buffer = undefined; this.onEnd = undefined; this.paused = false
    this.legacy.cancel()
  }
}
