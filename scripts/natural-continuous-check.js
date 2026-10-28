async page => {
  const errors = [], resources = []
  page.on('pageerror', error => errors.push(error.message))
  page.on('request', request => resources.push(request.url()))
  await page.goto('http://127.0.0.1:5181/listening-desk/#/practice/en')
  await page.reload()
  await page.getByRole('combobox', { name: '朗读声音' }).selectOption('kokoro:af_heart')
  await page.getByRole('button', { name: '准备本篇自然语音', exact: true }).click()
  await page.waitForFunction(() => document.querySelector('.natural-preparation')?.textContent.includes('本篇音频已就绪'), null, { timeout: 180000 })
  await page.evaluate(() => {
    window.__naturalQueue = []
    const start = AudioBufferSourceNode.prototype.start
    AudioBufferSourceNode.prototype.start = function(...args) { window.__naturalQueue.push(this.buffer?.duration); return start.apply(this, args) }
  })
  await page.getByRole('combobox', { name: '语速', exact: true }).selectOption('1.5')
  await page.getByRole('button', { name: '重复 3 次', exact: true }).click()
  await page.getByRole('button', { name: '播放', exact: true }).click()
  await page.waitForFunction(() => window.__naturalQueue.length >= 4, { timeout: 30000 })
  await page.keyboard.press('Alt+j')
  await page.waitForFunction(() => window.__naturalQueue.length >= 8, { timeout: 30000 })
  const queue = await page.evaluate(() => [...window.__naturalQueue])
  if (!(queue[0] === queue[1] && queue[1] === queue[2] && queue[3] !== queue[2])) throw new Error('Initial sentence did not repeat three times')
  if (!(queue[4] === queue[0] && queue[4] === queue[5] && queue[5] === queue[6] && queue[7] === queue[3])) throw new Error('Keyboard return did not reset three repeats and continue')
  await page.getByRole('button', { name: '停止朗读', exact: true }).click()
  const forbidden = resources.filter(url => /huggingface\.co|jsdelivr|unpkg/.test(url))
  if (forbidden.length) throw new Error(`External model dependency: ${forbidden}`)
  return { realAudioDurations: queue, allModelFilesSameOrigin: true, errors }
}
