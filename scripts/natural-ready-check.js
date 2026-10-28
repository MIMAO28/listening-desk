async page => {
  await page.waitForFunction(() => document.querySelector('.natural-preparation')?.textContent.includes('本篇音频已就绪'), { timeout: 180000 })
  const calls = await page.evaluate(() => {
    const qa = window.__naturalQA = []
    const start = AudioBufferSourceNode.prototype.start
    AudioBufferSourceNode.prototype.start = function(...args) { qa.push({ at: performance.now(), duration: this.buffer?.duration, length: this.buffer?.length }); return start.apply(this, args) }
    return true
  })
  await page.getByRole('button', { name: '播放', exact: true }).click()
  await page.waitForTimeout(150)
  const begin = await page.evaluate(() => performance.now())
  await page.keyboard.press('Alt+l')
  await page.waitForTimeout(150)
  const result = await page.evaluate(begin => ({ sources: window.__naturalQA, elapsed: window.__naturalQA.at(-1)?.at - begin }), begin)
  await page.getByRole('button', { name: '停止朗读', exact: true }).click()
  await page.getByRole('textbox', { name: '我的听写内容', exact: true }).fill('The quiet streets gave me time to think about my plans.')
  await page.getByRole('button', { name: '检查本句', exact: true }).click()
  const feedback = await page.locator('.answer-feedback').innerText()
  await page.getByRole('button', { name: '邮箱登录', exact: true }).click()
  const loginVisible = await page.getByRole('dialog').isVisible()
  await page.getByRole('button', { name: '关闭账号窗口', exact: true }).click()
  await page.setViewportSize({ width: 390, height: 844 })
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)
  await page.screenshot({ path: 'output/natural-practice-mobile.png', fullPage: true })
  await page.setViewportSize({ width: 1440, height: 1000 })
  await page.screenshot({ path: 'output/natural-practice-desktop.png', fullPage: true })
  return { calls, result, feedback, loginVisible, overflow }
}
