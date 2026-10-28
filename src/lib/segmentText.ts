export const MAX_CHARACTERS = 20_000
export const MAX_TEXT_BYTES = 100 * 1024

export function cleanText(text: string): string {
  return text.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n').trim()
}

export function validateText(text: string): string {
  const clean = cleanText(text)
  if (!clean) throw new Error('先粘贴文字，或选择一个有内容的 TXT 文件。')
  if (clean.length > MAX_CHARACTERS) throw new Error('文字超过 20,000 字符，请先分成较短的材料。')
  return clean
}

export function splitIntoSentences(text: string, language = 'en-US'): string[] {
  const clean = validateText(text)
  if (typeof Intl.Segmenter !== 'function') {
    throw new Error('当前浏览器不支持自动断句，请更新 Edge 或 Chrome，或在断句区手动输入一行一句。')
  }
  const segmenter = new Intl.Segmenter(language, { granularity: 'sentence' })
  const result = clean.split(/\n+/).flatMap(paragraph =>
    Array.from(segmenter.segment(paragraph), item => item.segment.trim()).filter(Boolean),
  )
  // Intl can split a title before an uppercase name. Join common honorifics.
  const sentences: string[] = []
  for (const part of result) {
    if (sentences.length && /\b(?:Mr|Mrs|Ms|Dr|Prof|Sr|Jr)\.$/i.test(sentences.at(-1)!)) {
      sentences[sentences.length - 1] += ` ${part}`
    } else sentences.push(part)
  }
  return sentences
}

export function sentencesFromLines(text: string): string[] {
  return validateText(text).split('\n').map(line => line.trim()).filter(Boolean)
}
