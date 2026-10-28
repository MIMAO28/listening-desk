async page => {
  const results = []
  const check = (ok, message) => { if (!ok) throw new Error(message); results.push(message) }
  const url = 'http://127.0.0.1:5181/listening-desk/#/practice/en'
  await page.addInitScript(() => {
    window.SpeechSynthesisUtterance = class { constructor(text) { this.text = text } }
    const NativeWebSocket = window.WebSocket
    const qa = window.__audioQA = { requests: [], sources: [], contexts: [], native: [], automatic: true }
    const voices = ['Aria', 'Guy', 'Jenny'].map(name => ({ name: `Microsoft ${name} Online (Natural) - English (United States)`, voiceURI: name, lang: 'en-US', localService: false }))
    Object.defineProperties(speechSynthesis, {
      getVoices: { configurable: true, value: () => voices },
      speak: { configurable: true, value: u => qa.native.push(u.text) },
      cancel: { configurable: true, value: () => {} },
      speaking: { configurable: true, get: () => false }, pending: { configurable: true, get: () => false }, paused: { configurable: true, get: () => false },
    })
    window.AudioContext = class {
      constructor() { this.state = 'running'; this.destination = {}; qa.contexts.push(this) }
      get currentTime() { return performance.now() / 1000 }
      resume() { this.state = 'running'; return Promise.resolve() }
      decodeAudioData(bytes) { return Promise.resolve({ duration: 5, text: new TextDecoder().decode(bytes) }) }
      createBufferSource() {
        const source = { playbackRate: { value: 1 }, connect() {}, disconnect() {}, stop() { source.stopped = true }, start(_, offset) { source.offset = offset; source.time = performance.now(); qa.sources.push(source) } }
        return source
      }
    }
    window.WebSocket = class {
      constructor(url, protocols) { if (!String(url).includes('consumer/speech')) return new NativeWebSocket(url, protocols); setTimeout(() => this.onopen?.(), 0) }
      close() {}
      send(message) {
        if (!message.includes('Path:ssml')) return
        const text = message.match(/<prosody[^>]*>([\s\S]*?)<\/prosody>/)[1]
        const voice = message.match(/<voice name="([^"]+)"/)[1]
        const request = { text, voice, finish: () => {
          if (request.done) return
          request.done = true
          const header = new TextEncoder().encode('Path:audio\r\n')
          const audio = new TextEncoder().encode(text)
          const packet = new Uint8Array(2 + header.length + audio.length)
          new DataView(packet.buffer).setUint16(0, header.length); packet.set(header, 2); packet.set(audio, 2 + header.length)
          this.onmessage?.({ data: packet.buffer }); this.onmessage?.({ data: 'Path:turn.end\r\n' })
        } }
        qa.requests.push(request)
        if (qa.automatic) setTimeout(request.finish, 60)
      }
    }
  })
  await page.goto(url); await page.reload()
  const count = () => page.evaluate(() => window.__audioQA.sources.length)
  const finish = () => page.evaluate(() => window.__audioQA.sources.at(-1).onended?.())
  const waitCount = n => page.waitForFunction(n => window.__audioQA.sources.length >= n, n)
  await page.getByRole('combobox', { name: '朗读声音' }).selectOption('Aria')
  check(await page.evaluate(() => window.__audioQA.requests.length) === 0, 'Opening the material and choosing voices do not upload text')
  await page.getByRole('textbox', { name: '我的听写内容', exact: true }).fill('Keep these notes.')
  await page.getByRole('button', { name: '重复 3 次', exact: true }).click()
  await page.getByRole('button', { name: '播放', exact: true }).click()
  await waitCount(1)
  await page.waitForFunction(() => window.__audioQA.requests.length === 3 && window.__audioQA.requests.every(r => r.done))
  const first = await page.evaluate(() => window.__audioQA.sources[0].buffer.text)
  await finish(); await waitCount(2); await finish(); await waitCount(3)
  check(await page.evaluate(first => window.__audioQA.sources.slice(0, 3).every(s => s.buffer.text === first), first), 'Three repetitions reuse the selected sentence audio')
  check(await page.evaluate(() => window.__audioQA.requests.length) === 3, 'Repeating audio makes no extra synthesis requests')
  await finish(); await waitCount(4)
  const second = await page.evaluate(() => window.__audioQA.sources.at(-1).buffer.text)
  check(first !== second, 'Three repetitions automatically advance to the next sentence')
  const before = await page.evaluate(() => performance.now())
  await page.keyboard.press('Alt+j'); await waitCount(5)
  const latency = await page.evaluate(before => window.__audioQA.sources[4].time - before, before)
  check(latency < 250, `Returning to cached audio starts promptly (${Math.round(latency)} ms including automation)`)
  check(await page.locator('.repeat-progress').textContent() === '1/3', 'Manual navigation resets to repetition one')
  await finish(); await waitCount(6); await finish(); await waitCount(7); await finish(); await waitCount(8)
  check(await page.evaluate(second => window.__audioQA.sources[7].buffer.text === second, second), 'Returning manually still plays three times and continues forward')
  const requests = await page.evaluate(() => window.__audioQA.requests.length)
  await page.getByRole('combobox', { name: '语速', exact: true }).selectOption('0.75')
  await waitCount(9)
  check(await page.evaluate(() => window.__audioQA.sources.at(-1).playbackRate.value) === 0.75, 'Speed changes use client audio playback rate')
  check(await page.evaluate(() => window.__audioQA.requests.length) === requests, 'Changing speed reuses audio without a network request')
  await page.getByRole('button', { name: '暂停', exact: true }).click()
  const paused = await count()
  await page.waitForTimeout(250)
  check(await count() === paused, 'Pause stops cached audio without advancing')
  await page.getByRole('button', { name: '继续播放', exact: true }).click(); await waitCount(paused + 1)
  check(await page.evaluate(() => window.__audioQA.sources.at(-1).offset) > 0, 'Resume continues from the paused position')
  await page.getByRole('button', { name: '停止朗读', exact: true }).click()
  await page.evaluate(() => { window.__audioQA.automatic = false })
  await page.getByRole('combobox', { name: '朗读声音' }).selectOption('Guy')
  await page.getByRole('button', { name: '播放', exact: true }).click()
  await page.waitForFunction(() => window.__audioQA.requests.some(r => r.voice === 'en-US-GuyNeural'))
  check(await page.getByText('正在准备这句音频，完成后自动播放…').isVisible(), 'Uncached selected voice shows a download status')
  await page.getByRole('button', { name: '暂停', exact: true }).click()
  const loadingPause = await count()
  await page.evaluate(() => window.__audioQA.requests.filter(r => r.voice === 'en-US-GuyNeural').forEach(r => r.finish()))
  await page.waitForTimeout(120)
  check(await count() === loadingPause, 'Audio downloaded while paused stays silent')
  await page.getByRole('button', { name: '继续播放', exact: true }).click(); await waitCount(loadingPause + 1)
  check(await page.evaluate(() => window.__audioQA.requests.some(r => r.voice === 'en-US-GuyNeural')), 'Changing voices synthesizes the exact selected speaker')
  await page.getByRole('button', { name: '停止朗读', exact: true }).click()
  await page.evaluate(() => window.__audioQA.requests.filter(r => r.voice === 'en-US-GuyNeural').forEach(r => r.finish()))
  await page.getByRole('combobox', { name: '朗读声音' }).selectOption('Jenny')
  await page.getByRole('button', { name: '播放', exact: true }).click()
  await page.waitForFunction(() => window.__audioQA.requests.some(r => r.voice === 'en-US-JennyNeural'))
  const stale = await count()
  await page.keyboard.press('Alt+j')
  await page.waitForFunction(first => window.__audioQA.requests.some(r => r.voice === 'en-US-JennyNeural' && r.text === first), first)
  await page.evaluate(first => window.__audioQA.requests.filter(r => r.voice === 'en-US-JennyNeural' && r.text !== first).forEach(r => r.finish()), first)
  await page.waitForTimeout(80)
  check(await count() === stale, 'A late download from a cancelled sentence never starts playing')
  await page.evaluate(first => window.__audioQA.requests.find(r => r.voice === 'en-US-JennyNeural' && r.text === first).finish(), first)
  await waitCount(stale + 1)
  check(await page.evaluate(first => window.__audioQA.sources.at(-1).buffer.text === first, first), 'Rapid switching plays only the latest selected sentence')
  check(await page.getByRole('textbox', { name: '我的听写内容', exact: true }).inputValue() === 'Keep these notes.', 'Cache and switching preserve dictation')
  check(await page.evaluate(() => window.__audioQA.native.length) === 0, 'Successful cached online playback never invokes native synthesis')
  await page.evaluate(() => { window.__audioQA.automatic = true; window.__audioQA.requests.forEach(r => r.finish()) })
  const initial = await count()
  for (let i = 0; i < 9; i++) {
    await finish()
    if (i < 8) await waitCount(initial + i + 1)
  }
  await page.getByRole('button', { name: '播放', exact: true }).waitFor()
  check(await count() === initial + 8, 'Cached transport finishes all three sentences exactly three times and stops')
  check(await page.locator('.sentence-row').last().getAttribute('aria-current') === 'step', 'Cached playback finishes at the last sentence')
  const previewCount = await count()
  await page.getByRole('button', { name: '试听声音', exact: true }).click(); await waitCount(previewCount + 1)
  check(await page.evaluate(() => window.__audioQA.sources.at(-1).buffer.text.startsWith('Today,')), 'Cached audio also plays the fixed preview sample')
  await finish()
  await page.getByRole('button', { name: '试听声音', exact: true }).waitFor()
  check(await count() === previewCount + 1, 'Preview finishes once without advancing the article queue')
  const clickCount = await count()
  await page.locator('.sentence-row').nth(1).click()
  await waitCount(clickCount + 1)
  check(await page.evaluate(second => window.__audioQA.sources.at(-1).buffer.text === second, second), 'Clicking transcript immediately starts the selected sentence')
  check(await page.locator('.repeat-progress').textContent() === '1/3', 'Clicking transcript keeps repeat mode and restarts repetition one')
  for (let i = 1; i <= 3; i++) { await finish(); await waitCount(clickCount + i + 1) }
  check(await page.locator('.sentence-row').last().getAttribute('aria-current') === 'step', 'Mouse-selected sentence repeats three times and automatically advances')
  await page.getByRole('button', { name: '暂停', exact: true }).click()
  const pausedClick = await count()
  await page.locator('.sentence-row').first().click(); await waitCount(pausedClick + 1)
  check(await page.getByRole('button', { name: '暂停', exact: true }).isVisible(), 'Clicking a sentence while paused starts playback immediately')
  await page.keyboard.press('Alt+l'); await waitCount(pausedClick + 2)
  for (let i = 1; i <= 3; i++) { await finish(); await waitCount(pausedClick + i + 2) }
  check(await page.locator('.sentence-row').last().getAttribute('aria-current') === 'step', 'Keyboard navigation after a mouse click still repeats and continues automatically')
  await page.getByRole('button', { name: '停止朗读', exact: true }).click()
  await page.getByRole('button', { name: '重复 3 次', exact: true }).click()
  const singleCount = await count()
  await page.locator('.sentence-row').first().click(); await waitCount(singleCount + 1)
  await finish(); await waitCount(singleCount + 2)
  check(await page.locator('.sentence-row').nth(1).getAttribute('aria-current') === 'step', 'Without repeat mode, mouse-selected sentence continues after one reading')
  await page.keyboard.press('Alt+j'); await waitCount(singleCount + 3)
  await finish(); await waitCount(singleCount + 4)
  check(await page.locator('.sentence-row').nth(1).getAttribute('aria-current') === 'step', 'Without repeat mode, keyboard-selected sentence also continues after one reading')
  await page.getByRole('button', { name: '停止朗读', exact: true }).click()
  const syncStart = await page.locator('.sentence-row').first().evaluate(e => {
    const before = window.__audioQA.sources.length
    e.click()
    return window.__audioQA.sources.length - before
  })
  check(syncStart === 1, 'A decoded sentence starts inside the click event without awaiting a promise or timer')
  await page.getByRole('button', { name: '停止朗读', exact: true }).click()
  await page.getByRole('button', { name: '导入材料', exact: true }).click()
  await page.getByLabel('材料标题', { exact: true }).fill('Moving warmup window')
  const warmSentences = Array.from({ length: 12 }, (_, i) => `Warm sentence number ${i + 1}.`)
  await page.getByLabel('原始文字', { exact: true }).fill(warmSentences.join('\n'))
  await page.getByRole('button', { name: '开始练习', exact: true }).click()
  await page.evaluate(() => { window.__audioQA.automatic = false })
  await page.locator('.sentence-row').first().click()
  await page.waitForFunction(() => window.__audioQA.requests.some(r => r.text === 'Warm sentence number 2.'))
  await page.evaluate(() => window.__audioQA.requests.find(r => r.text === 'Warm sentence number 1.').finish())
  await page.locator('.sentence-row').nth(8).click()
  await page.waitForFunction(() => window.__audioQA.requests.some(r => r.text === 'Warm sentence number 9.'))
  await page.evaluate(() => {
    window.__audioQA.requests.find(r => r.text === 'Warm sentence number 9.').finish()
    window.__audioQA.requests.find(r => r.text === 'Warm sentence number 2.').finish()
  })
  await page.waitForFunction(() => window.__audioQA.requests.some(r => r.text === 'Warm sentence number 10.'))
  check(true, 'Finishing an old in-flight warmup prepares the latest position neighbors instead of leaving them unprepared')
  await page.getByRole('button', { name: '停止朗读', exact: true }).click()
  await page.evaluate(() => window.__audioQA.requests.forEach(r => r.finish()))
  return { checks: results.length, results }
}
