import { mkdir, copyFile, writeFile, access } from 'node:fs/promises'
import { join } from 'node:path'

const root = 'public/vendor/kokoro'
const revision = '1939ad2a8e416c0acfeecc08a694d14ef25f2231'
const files = ['config.json', 'tokenizer.json', 'tokenizer_config.json', 'onnx/model_quantized.onnx',
  ...['af_heart','af_bella','am_michael','am_fenrir','bf_emma','bf_isabella','bm_george','bm_fable'].map(v => `voices/${v}.bin`)]
for (const file of files) {
  const target = join(root, 'model', file)
  try { await access(target); continue } catch { /* Download missing files. */ }
  await mkdir(join(target, '..'), { recursive: true })
  const response = await fetch(`https://huggingface.co/onnx-community/Kokoro-82M-v1.0-ONNX/resolve/${revision}/${file}`)
  if (!response.ok) throw new Error(`${file}: HTTP ${response.status}`)
  await writeFile(target, new Uint8Array(await response.arrayBuffer()))
  console.log(`Prepared ${file}`)
}
await mkdir(join(root, 'runtime'), { recursive: true })
for (const file of ['ort-wasm-simd-threaded.jsep.mjs', 'ort-wasm-simd-threaded.jsep.wasm']) {
  await copyFile(`node_modules/@huggingface/transformers/dist/${file}`, join(root, 'runtime', file))
}
await copyFile('node_modules/kokoro-js/LICENSE', join(root, 'LICENSE'))
console.log('Kokoro resources ready; no external model/CDN request is required at runtime.')
