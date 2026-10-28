async page => {
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  await page.goto('http://127.0.0.1:5173/#/practice/en')
  await page.getByRole('combobox', { name: '朗读声音' }).waitFor()
  const voices = await page.getByRole('combobox', { name: '朗读声音' }).locator('option').allTextContents()
  await page.getByRole('combobox', { name: '朗读声音' }).selectOption('kokoro:af_heart')
  await page.waitForTimeout(300)
  await page.getByRole('button', { name: '准备本篇自然语音', exact: true }).click()
  await page.waitForTimeout(1200)
  return { selected: await page.getByRole('combobox', { name: '朗读声音' }).inputValue(), voices: voices.slice(0, 10), progress: await page.locator('.natural-preparation').innerText(), errors }
}
