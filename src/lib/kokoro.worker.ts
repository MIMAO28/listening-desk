import { KokoroTTS } from 'kokoro-js'
import { env } from '@huggingface/transformers'
import type { NATURAL_VOICES } from './naturalVoices.ts'
import { speechChunks } from './speechChunks.ts'

const scope = self as unknown as { postMessage: (data: unknown, transfer?: Transferable[]) => void; onmessage: ((event: MessageEvent) => void) | null }
const base = new URL(`${import.meta.env.BASE_URL}vendor/kokoro/`, self.location.origin).href
env.allowRemoteModels = false
env.allowLocalModels = true
env.useBrowserCache = true
env.localModelPath = base
env.backends.onnx.wasm!.wasmPaths = `${base}runtime/`
env.backends.onnx.wasm!.numThreads = 1
env.backends.onnx.wasm!.proxy = false
// kokoro-js 1.2.1 hardcodes its voice URL. Redirect only that exact public
// resource to our own pinned copy; material text never leaves this worker.
const originalFetch = self.fetch.bind(self)
self.fetch = async (input, init) => {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
  const voice = url.match(/^https:\/\/huggingface.co\/onnx-community\/Kokoro-82M-v1.0-ONNX\/resolve\/main\/voices\/([a-z_]+)\.bin$/)
  const target = voice ? `${base}model/voices/${voice[1]}.bin` : url
  // Pinned runtime/voice bytes only. No material text or auth request is cached.
  if (target.startsWith(base) && /\.(wasm|bin)$/.test(target) && (!init?.method || init.method === 'GET')) {
    let cache: Cache | undefined
    try { cache = await caches.open('listening-desk-voice-resources-c46655e8-1939ad2'); const hit = await cache.match(target); if (hit) return hit } catch { /* Private mode can deny storage. */ }
    const response = await originalFetch(target, init)
    if (response.ok && cache) void cache.put(target, response.clone()).catch(() => {})
    return response
  }
  return originalFetch(voice ? target : input, init)
}
let model: Promise<KokoroTTS> | undefined
type Job = { job: number; texts: string[]; voice: typeof NATURAL_VOICES[number]['id'] }
let latest = 0
let queue = Promise.resolve()
scope.onmessage = ({ data }: MessageEvent<Job & { cancel?: boolean }>) => {
  latest = data.job
  if (!data.cancel) queue = queue.then(() => run(data))
}
async function run(data: Job) {
  if (data.job !== latest) return
  try {
    model ??= KokoroTTS.from_pretrained('model', { dtype: 'q8', device: 'wasm', progress_callback: progress => {
      if (progress.status === 'progress' && 'progress' in progress) scope.postMessage({ kind: 'download', job: data.job, percent: progress.progress })
    } })
    const tts = await model
    if (data.job !== latest) return
    scope.postMessage({ kind: 'model-ready', job: data.job })
    for (let index = 0; index < data.texts.length; index++) {
      // The upstream stream(string) leaves its splitter open in 1.2.1.
      // Use bounded, fully consumed chunks instead; never drop a long tail.
      const chunks: Float32Array[] = []
      let rate = 24000, length = 0
      for (const text of speechChunks(data.texts[index])) {
        if (data.job !== latest) return
        const audio = await tts.generate(text, { voice: data.voice })
        if (data.job !== latest) return
        chunks.push(new Float32Array(audio.audio)); length += audio.audio.length; rate = audio.sampling_rate
      }
      if (!length) throw new Error('No audio was generated for this sentence')
      const samples = new Float32Array(length)
      let offset = 0
      for (const chunk of chunks) { samples.set(chunk, offset); offset += chunk.length }
      scope.postMessage({ kind: 'sentence', job: data.job, index, samples, rate }, [samples.buffer])
    }
    scope.postMessage({ kind: 'done', job: data.job })
  } catch (error) {
    model = undefined
    scope.postMessage({ kind: 'error', job: data.job, message: error instanceof Error ? error.message : String(error) })
  }
}
