import { test } from 'node:test'
import assert from 'node:assert/strict'
import { edgeHandshake, edgeVoiceName, SentenceAudioCache } from './edgeAudio.ts'

test('online voice mapping keeps exact locale and multilingual speaker identity', () => {
  const voice = { name: 'Microsoft Aria Online (Natural) - English (United States)', lang: 'en-US', voiceURI: 'aria', localService: false }
  assert.equal(edgeVoiceName(voice), 'en-US-AriaNeural')
  assert.equal(edgeVoiceName({ ...voice, name: 'Microsoft AndrewMultilingual Online (Natural)' }), 'en-US-AndrewMultilingualNeural')
  assert.equal(edgeVoiceName({ ...voice, localService: true }), null)
  assert.equal(edgeVoiceName({ ...voice, name: 'Google US English' }), null)
  assert.equal(edgeVoiceName({ ...voice, name: 'Microsoft Nanami Online (Natural)', lang: 'ja-JP' }), 'ja-JP-NanamiNeural')
})
test('handshake has stable protocol vector and five-minute lifetime', async () => {
  assert.equal(await edgeHandshake(1793060000000), '015E265584A1FB0D-B577938795399724E2284567D8D3FD5D8C8A84F13BFB4C4F72E8958D10580E72')
  assert.equal(await edgeHandshake(1793060000000), await edgeHandshake(1793060001000))
  assert.notEqual(await edgeHandshake(1793060000000), await edgeHandshake(1793060300000))
})
test('audio cache deduplicates in-flight and repeated requests without mixing speakers', async () => {
  let requests = 0
  const cache = new SentenceAudioCache(async () => { requests++; return new Blob(['audio']) })
  const [a, b] = await Promise.all([cache.get('First.', 'Aria'), cache.get('First.', 'Aria')])
  assert.equal(a, b); assert.equal(requests, 1)
  assert.equal(await cache.get('First.', 'Aria'), a); assert.equal(requests, 1)
  await cache.get('First.', 'Guy'); assert.equal(requests, 2)
})
test('audio cache evicts least recently used audio within its memory budget', async () => {
  const cache = new SentenceAudioCache(async text => new Blob([text]), 6)
  await cache.get('one', 'Aria'); await cache.get('two', 'Aria')
  cache.peek('one', 'Aria')
  await cache.get('six', 'Aria')
  assert.ok(cache.peek('one', 'Aria')); assert.equal(cache.peek('two', 'Aria'), undefined)
  assert.ok(cache.peek('six', 'Aria'))
})
test('failed audio is not cached, so a later retry can succeed', async () => {
  let requests = 0
  const cache = new SentenceAudioCache(async () => { if (++requests === 1) throw new Error('offline'); return new Blob(['ok']) })
  await assert.rejects(cache.get('First.', 'Aria'))
  assert.equal((await cache.get('First.', 'Aria')).size, 2)
})
test('rapid sentence changes never launch more than three downloads at once', async () => {
  let active = 0, maximum = 0
  const cache = new SentenceAudioCache(async () => {
    maximum = Math.max(maximum, ++active)
    await new Promise(resolve => setTimeout(resolve, 2))
    active--; return new Blob(['ok'])
  })
  await Promise.all(Array.from({ length: 12 }, (_, i) => cache.get(String(i), 'Aria')))
  assert.equal(maximum, 3)
})
