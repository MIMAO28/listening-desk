import { BrowserSpeechPort } from './speechPlayer.ts'
import type { SpeechPort, SpeechSettings } from './speechPlayer.ts'
import { edgeVoiceName, SentenceAudioCache } from './edgeAudio.ts'

type AudioStatus = 'idle' | 'loading' | 'cached' | 'fallback'
/** Online Microsoft voices use reusable audio; other voices keep the native engine. */
export class CachedSpeechPort implements SpeechPort {
  private native = new BrowserSpeechPort()
  private cache = new SentenceAudioCache(undefined, 6 * 1024 * 1024)
  private decoded = new WeakMap<Blob, Promise<AudioBuffer>>()
  private readyBuffers = new WeakMap<Blob, AudioBuffer>()
  private context: AudioContext | undefined
  private source: AudioBufferSourceNode | undefined
  private buffer: AudioBuffer | undefined
  private offset = 0
  private started = 0
  private rate = 1
  private paused = false
  private online = false
  private ticket = 0
  private voice: SpeechSynthesisVoice | undefined
  private neighbors: readonly string[] = []
  private selected = ''
  private activated = ''
  private unavailable = new Set<string>()
  private warming = false
  private ended: (() => void) | undefined
  private recover: (() => void) | undefined
  private status: AudioStatus = 'idle'
  private listeners = new Set<() => void>()
  getSnapshot = () => this.status
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => this.listeners.delete(listener) }
  private publish(status: AudioStatus) { this.status = status; this.listeners.forEach(listener => listener()) }

  prepare(texts: readonly string[], settings: SpeechSettings, voice: SpeechSynthesisVoice) {
    this.native.prepare(texts, settings, voice)
    this.voice = voice
    this.neighbors = texts
    this.selected = edgeVoiceName(voice) ?? ''
    // Merely opening a page or choosing a voice must not upload the material.
    if (this.activated === this.selected && this.selected) this.warm()
  }
  private async decode(blob: Blob): Promise<AudioBuffer> {
    let pending = this.decoded.get(blob)
    if (!pending) {
      pending = blob.arrayBuffer().then(bytes => this.context!.decodeAudioData(bytes)).then(buffer => {
        this.readyBuffers.set(blob, buffer)
        return buffer
      })
      this.decoded.set(blob, pending)
    }
    return pending
  }
  private async warm() {
    if (this.warming || !this.context || this.unavailable.has(this.selected)) return
    this.warming = true
    const attempted = new Set<string>()
    try {
      // Re-read the current window after every download. An old in-flight warmup
      // must not leave the newly selected sentence's neighbors unprepared.
      while (this.selected && this.activated === this.selected && !this.unavailable.has(this.selected)) {
        const voice = this.selected
        const text = this.neighbors.find(text => {
          const blob = this.cache.peek(text, voice)
          return !attempted.has(JSON.stringify([voice, text])) && (!blob || !this.readyBuffers.has(blob))
        })
        if (!text) break
        attempted.add(JSON.stringify([voice, text]))
        try {
          const blob = await this.cache.get(text, voice, false)
          await this.decode(blob)
        } catch { /* Try other neighbors, not an endless retry of one failure. */ }
      }
    } catch { /* Background failures do not interrupt current audio. */ }
    finally { this.warming = false }
  }
  speak(text: string, settings: SpeechSettings, onEnd: () => void, onError: (message: string) => void) {
    const ticket = ++this.ticket
    const voice = this.voice?.voiceURI === settings.voiceURI ? this.voice
      : window.speechSynthesis.getVoices().find(item => item.voiceURI === settings.voiceURI)
    const name = voice && edgeVoiceName(voice)
    const canCache = name && !this.unavailable.has(name) && typeof WebSocket === 'function' && typeof AudioContext === 'function' && !!crypto.subtle
    if (!canCache) {
      this.online = false
      this.publish(name && this.unavailable.has(name) ? 'fallback' : 'idle')
      this.native.speak(text, settings, onEnd, onError)
      return
    }
    this.online = true
    this.paused = false
    this.offset = 0
    this.buffer = undefined
    this.rate = settings.rate
    this.ended = onEnd
    this.activated = name
    this.context ??= new AudioContext()
    // Resume in the click/keyboard gesture, before waiting for network audio.
    const ready = this.context.state === 'running' ? Promise.resolve() : this.context.resume()
    const hit = this.cache.peek(text, name)
    this.publish(hit ? 'cached' : 'loading')
    const fallback = () => {
      if (ticket !== this.ticket) return
      this.unavailable.add(name)
      this.clearSource()
      this.online = false
      this.publish('fallback')
      // Same selected voice, no surprise substitution with a local voice.
      this.native.speak(text, settings, onEnd, onError)
      if (this.paused) this.native.pause()
    }
    this.recover = fallback
    const decoded = hit && this.readyBuffers.get(hit)
    if (decoded && this.context.state === 'running') {
      this.buffer = decoded
      this.start(ticket)
      void this.warm()
      return
    }
    const audio = hit ? Promise.resolve(hit) : this.cache.get(text, name)
    // Start preparing the next sentence while the first download is in progress.
    void this.warm()
    void (async () => {
      const [, blob] = await Promise.all([ready, audio])
      if (ticket !== this.ticket) return
      const buffer = await this.decode(blob)
      if (ticket !== this.ticket) return
      this.buffer = buffer
      this.publish('cached')
      if (!this.paused) this.start(ticket)
      void this.warm()
    })().catch(fallback)
  }
  private start(ticket: number) {
    if (!this.context || !this.buffer || this.source || this.paused || ticket !== this.ticket) return
    if (this.context.state !== 'running') throw new Error('Audio requires user gesture')
    const source = this.context.createBufferSource()
    source.buffer = this.buffer
    source.playbackRate.value = this.rate
    source.connect(this.context.destination)
    this.source = source
    this.started = this.context.currentTime
    source.onended = () => {
      if (ticket !== this.ticket || this.source !== source) return
      source.disconnect(); this.source = undefined; this.buffer = undefined
      this.ended?.()
    }
    source.start(0, Math.min(this.offset, this.buffer.duration))
  }
  pause() {
    this.paused = true
    if (!this.online) { this.native.pause(); return }
    if (this.source && this.context) this.offset += (this.context.currentTime - this.started) * this.rate
    this.clearSource()
  }
  resume() {
    this.paused = false
    if (!this.online) { this.native.resume(); return }
    const ticket = this.ticket
    void this.context?.resume().then(() => { if (ticket === this.ticket) this.start(ticket) })
      .catch(() => { if (ticket === this.ticket) this.recover?.() })
  }
  private clearSource() {
    if (this.source) { this.source.onended = null; this.source.stop(); this.source.disconnect(); this.source = undefined }
  }
  cancel() {
    this.ticket++
    this.clearSource()
    this.native.cancel()
    this.buffer = undefined; this.ended = undefined; this.recover = undefined; this.paused = false
    this.activated = ''
    this.publish('idle')
  }
}
