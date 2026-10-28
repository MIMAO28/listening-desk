/** Browser-side Read Aloud protocol. No account keys or persistent audio storage.
 * The wire format and CS64 arithmetic are protocol facts; this table-driven
 * implementation is independent of third-party TTS client source code.
 */
const CLIENT = '6A5AA1D4EAFF4E9FB37E23D68491D6F4'
const encoder = new TextEncoder()
const hex = (bytes: Uint8Array) => Array.from(bytes, value => value.toString(16).padStart(2, '0')).join('').toUpperCase()
const swap = (value: number) => (value << 16 | value >>> 16) >>> 0

export async function edgeHandshake(now = Date.now()): Promise<string> {
  const seconds = Math.floor(now / 1000) + 11644473600
  const ticks = ((seconds - seconds % 300) * 10000000).toFixed(0)
  const message = encoder.encode(`Copyright (C) Microsoft Corporation. All rights reserved.${ticks}${CLIENT}`)
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', message))
  const keys = new DataView(digest.buffer)
  const padded = new Uint8Array(Math.ceil(message.length / 8) * 8)
  padded.set(message)
  const input = new DataView(padded.buffer)
  const multipliers = [keys.getUint32(0, true) | 1, keys.getUint32(4, true) | 1]
  const factors = [[0xef0569fb, 0x76f50f34, 0xc3efea97], [0xc31713db, 0x1881ce3c, 0x35bd1ec9]]
  let swapLast = 0, swapSum = 0, reversible = 0, reversibleSum = 0
  for (let offset = 0; offset < padded.length; offset += 4) {
    const lane = offset / 4 % 2
    const word = input.getUint32(offset, true)
    const [first, second, third] = factors[lane]
    const mixed = Math.imul(swap(Math.imul(swap(word), first) + Math.imul(word, multipliers[lane])), second)
    swapLast = (mixed + Math.imul(swap(mixed), third)) >>> 0
    swapSum = (swapSum + swapLast) >>> 0
    reversible = Math.imul(reversible + word, multipliers[lane]) >>> 0
    if (lane === 0) {
      for (const factor of [0xcf98b111, 0x87085b9f, 0x12ceb96d, 0x257e1d83]) reversible = Math.imul(swap(reversible), factor) >>> 0
    } else {
      reversible = Math.imul(swap(reversible), 0xa27416f5) >>> 0
      reversible = swap(Math.imul(swap(reversible), 0xd38396ff))
      reversible = Math.imul(swap(Math.imul(reversible, 0x7c932b89)), 0xbfa49f69) >>> 0
    }
    reversibleSum = (reversibleSum + reversible) >>> 0
  }
  const checksum = new DataView(new ArrayBuffer(8))
  checksum.setUint32(0, swapLast ^ reversible, true)
  checksum.setUint32(4, swapSum ^ reversibleSum, true)
  return `${hex(new Uint8Array(checksum.buffer))}-${hex(digest)}`
}

export function edgeVoiceName(voice: Pick<SpeechSynthesisVoice, 'name' | 'lang' | 'localService' | 'voiceURI'>): string | null {
  if (voice.localService || !/Microsoft/i.test(voice.name) || !/Online|Neural/i.test(voice.name + voice.voiceURI)) return null
  const canonical = (voice.voiceURI + ' ' + voice.name).match(/\b[a-z]{2,3}-[A-Z]{2}-[A-Za-z]+Neural\b/)
  if (canonical) return canonical[0]
  const named = voice.name.match(/^Microsoft\s+([A-Za-z]+)\s+Online/i)
  const lang = voice.lang.replace('_', '-')
  return named && /^[a-z]{2,3}-[A-Z]{2}$/.test(lang) ? `${lang}-${named[1]}Neural` : null
}

const xml = (text: string) => text.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[char]!)
export async function fetchEdgeAudio(text: string, voice: string): Promise<Blob> {
  const token = await edgeHandshake()
  return new Promise((resolve, reject) => {
    const id = crypto.randomUUID().replaceAll('-', '')
    const query = new URLSearchParams({ ConnectionId: id, TrustedClientToken: CLIENT, 'Sec-MS-GEC': token, 'Sec-MS-GEC-Version': '2-143.0.3650.75' })
    const socket = new WebSocket(`wss://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1?${query}`)
    socket.binaryType = 'arraybuffer'
    const chunks: ArrayBuffer[] = []
    let settled = false
    const finish = (error?: Error) => {
      if (settled) return
      settled = true
      clearTimeout(timeout)
      socket.onopen = socket.onmessage = socket.onerror = socket.onclose = null
      socket.close()
      if (error) reject(error)
      else if (!chunks.length) reject(new Error('Empty speech audio'))
      else resolve(new Blob(chunks, { type: 'audio/mpeg' }))
    }
    const timeout = setTimeout(() => finish(new Error('Speech download timed out')), 12000)
    socket.onopen = () => {
      socket.send('Content-Type:application/json; charset=utf-8\r\nPath:speech.config\r\n\r\n' + JSON.stringify({ context: { synthesis: { audio: { metadataoptions: { sentenceBoundaryEnabled: false, wordBoundaryEnabled: false }, outputFormat: 'audio-24khz-48kbitrate-mono-mp3' } } } }))
      socket.send(`X-RequestId:${id}\r\nContent-Type:application/ssml+xml\r\nPath:ssml\r\n\r\n<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="${voice.split('-').slice(0, 2).join('-')}"><voice name="${voice}"><prosody rate="+0%" pitch="+0Hz" volume="+0%">${xml(text)}</prosody></voice></speak>`)
    }
    socket.onmessage = event => {
      if (typeof event.data === 'string') {
        if (event.data.includes('Path:turn.end')) finish()
      } else if (event.data instanceof ArrayBuffer && event.data.byteLength > 2) {
        const length = new DataView(event.data).getUint16(0)
        if (length + 2 < event.data.byteLength) {
          const header = new TextDecoder().decode(event.data.slice(2, length + 2))
          if (/Path:audio\r?\n|Path:audio$/i.test(header)) chunks.push(event.data.slice(length + 2))
        }
      }
    }
    socket.onerror = () => finish(new Error('Speech connection unavailable'))
    socket.onclose = () => finish(new Error('Speech connection closed'))
  })
}

/** Rate is deliberately absent from the key: speed changes reuse the same MP3. */
export class SentenceAudioCache {
  private entries = new Map<string, Blob>()
  private pending = new Map<string, Promise<Blob>>()
  private bytes = 0
  private fetcher: (text: string, voice: string) => Promise<Blob>
  private limit: number
  private active = 0
  private queue: (() => void)[] = []
  constructor(fetcher = fetchEdgeAudio, limit = 24 * 1024 * 1024) { this.fetcher = fetcher; this.limit = limit }
  private key(text: string, voice: string) { return JSON.stringify([voice, text]) }
  peek(text: string, voice: string) {
    const key = this.key(text, voice), blob = this.entries.get(key)
    if (blob) { this.entries.delete(key); this.entries.set(key, blob) }
    return blob
  }
  get(text: string, voice: string, foreground = true): Promise<Blob> {
    const existing = this.peek(text, voice)
    if (existing) return Promise.resolve(existing)
    const key = this.key(text, voice)
    const pending = this.pending.get(key)
    if (pending) return pending
    const download = new Promise<Blob>((resolve, reject) => {
      const run = () => {
        this.active++
        void Promise.resolve().then(() => this.fetcher(text, voice)).then(resolve, reject).finally(() => {
          this.active--; this.queue.shift()?.()
        })
      }
      if (this.active < 3) run()
      else if (foreground) this.queue.unshift(run)
      else this.queue.push(run)
    })
    const request = download.then(blob => {
      if (!blob.size) throw new Error('Empty audio')
      if (blob.size <= this.limit) {
        while (this.bytes + blob.size > this.limit && this.entries.size) {
          const oldest = this.entries.keys().next().value!
          this.bytes -= this.entries.get(oldest)!.size
          this.entries.delete(oldest)
        }
        this.entries.set(key, blob); this.bytes += blob.size
      }
      return blob
    }).finally(() => this.pending.delete(key))
    this.pending.set(key, request)
    return request
  }
}
