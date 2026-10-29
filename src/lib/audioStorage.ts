const REVISION = 'kokoro-q8-1939ad2-v1'
let database: Promise<IDBDatabase> | undefined
function db() {
  database ??= new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open('listening-desk-audio', 1)
    request.onupgradeneeded = () => request.result.createObjectStore('audio')
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  }).catch(error => { database = undefined; throw error })
  return database
}
async function key(uri: string, text: string) {
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify([REVISION, uri, text])))
  return Array.from(new Uint8Array(hash), b => b.toString(16).padStart(2, '0')).join('')
}
export async function readAudio(uri: string, text: string): Promise<{ samples: Float32Array; rate: number } | undefined> {
  const [database, id] = await Promise.all([db(), key(uri, text)])
  return new Promise((resolve, reject) => {
    const req = database.transaction('audio').objectStore('audio').get(id)
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}
let writing = Promise.resolve()
export function writeAudio(uri: string, text: string, samples: Float32Array, rate: number) {
  const operation = writing.catch(() => {}).then(async () => {
    const [database, id] = await Promise.all([db(), key(uri, text)])
    await new Promise<void>((resolve, reject) => {
      const tx = database.transaction('audio', 'readwrite'), store = tx.objectStore('audio')
      const budget = store.get('__bytes')
      budget.onsuccess = () => {
        const previous = store.get(id)
        previous.onsuccess = () => {
          const bytes = Number(budget.result ?? 0) - (previous.result?.samples?.byteLength ?? 0) + samples.byteLength
          if (bytes > 256 * 1024 * 1024) { tx.abort(); return }
          store.put({ samples, rate }, id); store.put(bytes, '__bytes')
        }
      }
      tx.oncomplete = () => resolve()
      tx.onerror = tx.onabort = () => reject(tx.error ?? new Error('音频缓存已满'))
    })
  })
  writing = operation
  return operation
}
