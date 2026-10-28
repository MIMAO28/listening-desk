/** Bound phoneme context without dropping the tail of a long academic sentence. */
export function speechChunks(text: string, limit = 240): string[] {
  const chunks: string[] = []
  let remaining = text.trim()
  while (remaining.length > limit) {
    const window = remaining.slice(0, limit)
    const punctuation = [...window.matchAll(/[,;:]\s+/g)].at(-1)
    const space = window.lastIndexOf(' ')
    const boundary = punctuation && punctuation.index > limit / 2 ? punctuation.index + 1 : space > 0 ? space : limit
    chunks.push(remaining.slice(0, boundary).trim()); remaining = remaining.slice(boundary).trim()
  }
  if (remaining) chunks.push(remaining)
  return chunks
}
