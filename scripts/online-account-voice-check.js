async page => {
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  await page.goto('https://mimao28.github.io/listening-desk/?v=10#/practice/en')
  await page.getByRole('combobox', { name: '朗读声音' }).waitFor()
  const count = await page.getByRole('combobox', { name: '朗读声音' }).locator('option[value^="kokoro:"]').count()
  await page.getByRole('combobox', { name: '朗读声音' }).selectOption('kokoro:af_heart')
  await page.getByRole('button', { name: '准备自然语音', exact: true }).click()
  await page.waitForFunction(() => document.querySelector('.natural-preparation')?.textContent.includes('本篇音频已就绪'), null, { timeout: 180000 })
  await page.evaluate(() => {
    const qa = window.__onlineAudio = []
    const original = AudioBufferSourceNode.prototype.start
    AudioBufferSourceNode.prototype.start = function(...args) { qa.push({ at: performance.now(), duration: this.buffer?.duration }); return original.apply(this, args) }
  })
  await page.getByRole('button', { name: '播放', exact: true }).click()
  const before = await page.evaluate(() => performance.now())
  await page.keyboard.press('Alt+l')
  const audio = await page.evaluate(before => ({ calls: window.__onlineAudio, switchMs: window.__onlineAudio.at(-1).at - before }), before)
  await page.getByRole('button', { name: '停止朗读', exact: true }).click()
  await page.getByRole('textbox', { name: '我的听写内容', exact: true }).fill('The quiet streets gave me time to think about my plans.')
  await page.getByRole('button', { name: '检查本句', exact: true }).click()
  const feedback = await page.locator('.answer-feedback').innerText()
  await page.getByRole('banner').getByRole('button', { name: '邮箱登录', exact: true }).click()
  const login = await page.getByRole('dialog').isVisible()
  await page.getByRole('button', { name: '关闭账号窗口', exact: true }).click()
  await page.getByRole('link', { name: '学习面板', exact: true }).click()
  await page.getByRole('heading', { name: '让每一次练习留下积累', exact: true }).waitFor()
  await page.setViewportSize({ width: 390, height: 844 })
  const fits = await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)
  const config = await page.evaluate(async () => { const r = await fetch('./account-config.json'); const c = await r.json(); return { url: c.url, publicKeyType: c.publishableKey.startsWith('sb_publishable_') } })
  await page.screenshot({ path: 'output/online-account-guest.png', fullPage: true })
  return { voiceCount: count, audio, feedback, login, mobileFits: fits, config, errors }
}
