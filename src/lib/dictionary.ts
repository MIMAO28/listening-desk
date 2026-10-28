import { assetUrl } from './assetUrl.ts'

export interface DictionaryMeaning {
  partOfSpeech: string
  definition: string
  example: string
  chinese: string[]
}

export interface DictionaryResult {
  word: string
  phonetic: string
  meanings: DictionaryMeaning[]
  sourceUrl: string
}

export const DICTIONARY_API = 'https://freedictionaryapi.com/api/v1/entries'
export const TRANSLATION_API = 'https://api.mymemory.translated.net/get'
export const DICTIONARY_QUERY_LIMIT = 1000

const record = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value)
const text = (value: unknown, max = 700) => typeof value === 'string' ? value.trim().slice(0, max) : ''
const array = (value: unknown): unknown[] => Array.isArray(value) ? value : []

export function dictionaryQuery(value: string): string {
  const query = value.trim().replace(/\s+/g, ' ').replace(/^[“”"(（.,!?，。！？;；:：]+|[“”")）.,!?，。！？;；:：]+$/g, '').trim()
  if (!query) throw new Error('先输入一个单词或短语。')
  if (query.length > 80 || query.split(' ').length > 8) {
    throw new Error('请查询较短的单词或短语，最多 80 个字符、8 个词。')
  }
  if (!/^[\p{L}\p{M}\s'’\-]+$/u.test(query)) throw new Error('请输入单词或短语，不含网址、数字或特殊符号。')
  return query
}

export function dictionaryLanguage(query: string): 'en' | 'ja' {
  return /[\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Han}]/u.test(query) ? 'ja' : 'en'
}

export function youdaoUrl(query: string) {
  return `https://www.youdao.com/result?word=${encodeURIComponent(query)}&lang=${dictionaryLanguage(query)}`
}

export function cambridgeUrl(query: string) {
  return `https://dictionary.cambridge.org/dictionary/english-chinese-simplified/${encodeURIComponent(query.toLowerCase().replace(/\s+/g, '-'))}`
}

export function parseDictionaryResult(value: unknown, query: string): DictionaryResult | null {
  if (!record(value)) return null
  const candidates: { meaning: DictionaryMeaning; outdated: boolean }[] = []
  let inspected = 0
  const collectSenses = (senses: unknown, partOfSpeech: string, depth = 0, inheritedOutdated = false) => {
    if (depth > 4) return
    for (const sense of array(senses).slice(0, 24)) {
      if (++inspected > 160) return
      if (!record(sense)) continue
      const definition = text(sense.definition)
      const outdated = inheritedOutdated || array(sense.tags).some(tag =>
        /^(archaic|obsolete|historical|dated|rare)$/i.test(text(tag, 40)))
        || /^\([^)]*\b(archaic|obsolete|historical|dated|rare)\b[^)]*\)/i.test(definition)
      const children = array(sense.subsenses)
      // Some words group their real definitions beneath headings such as
      // "Senses relating to tangible things." Prefer actual child definitions.
      if (children.some(record)) {
        collectSenses(children, partOfSpeech, depth + 1, outdated)
        continue
      }
      if (!definition) continue
      const chinese = array(sense.translations).slice(0, 80).filter(item => {
        if (!record(item) || !record(item.language)) return false
        return ['zh', 'zho', 'cmn'].includes(text(item.language.code, 12))
      }).map(item => record(item) ? text(item.word, 100) : '').filter(Boolean)
      candidates.push({ outdated, meaning: { partOfSpeech, definition,
        example: text(array(sense.examples)[0], 450), chinese: [...new Set(chinese)].slice(0, 4) } })
    }
  }
  let phonetic = ''
  for (const entry of array(value.entries).slice(0, 8)) {
    if (!record(entry)) continue
    if (!phonetic) {
      const pronunciation = array(entry.pronunciations).slice(0, 24).find(item => record(item) && item.type === 'ipa' && text(item.text, 100))
      if (record(pronunciation)) phonetic = text(pronunciation.text, 100)
    }
    collectSenses(entry.senses, text(entry.partOfSpeech, 40))
  }
  // Keep source order within each group, but let current usages fit before old usages.
  const meanings = candidates.sort((a, b) => Number(a.outdated) - Number(b.outdated)).slice(0, 5).map(item => item.meaning)
  if (!meanings.length) return null
  // Construct source links locally. Remote content can never supply a script or redirect URL.
  return { word: text(value.word, DICTIONARY_QUERY_LIMIT) || query, phonetic, meanings,
    sourceUrl: `https://en.wiktionary.org/wiki/${encodeURIComponent(query)}` }
}

export function parseReferenceTranslation(value: unknown): string {
  if (!record(value) || Number(value.responseStatus) !== 200 || value.quotaFinished === true || !record(value.responseData)) return ''
  const translated = text(value.responseData.translatedText, 3000)
  // Avoid showing provider error messages or non-Chinese responses as a Chinese meaning.
  return /\p{Script=Han}/u.test(translated) ? translated : ''
}

async function readJson(url: string, signal: AbortSignal): Promise<unknown> {
  const response = await fetch(url, { signal, credentials: 'omit', referrerPolicy: 'no-referrer' })
  if (response.status === 404) return null
  if (response.status === 429) throw new Error('查询次数较多，请稍后再试，或打开详细词典。')
  if (!response.ok) throw new Error('查词服务暂时不可用，可以打开详细词典继续查询。')
  return response.json()
}

export async function lookupDictionary(query: string, signal: AbortSignal) {
  const url = `${DICTIONARY_API}/${dictionaryLanguage(query)}/${encodeURIComponent(query)}?translations=true`
  return parseDictionaryResult(await readJson(url, signal), query)
}

export async function lookupReferenceTranslation(query: string, signal: AbortSignal, language = dictionaryLanguage(query)) {
  const parameters = new URLSearchParams({ q: query, langpair: `${language}|zh-CN` })
  return parseReferenceTranslation(await readJson(`${TRANSLATION_API}?${parameters}`, signal))
}

export interface ChineseMeaning { partOfSpeech: string; translation: string; headword?: string }
export interface ChineseDictionaryResult { word: string; meanings: ChineseMeaning[]; source: 'ecdict' | 'translated'; sourceUrl: string }

const englishShards = new Map<string, Record<string, unknown>>()
const formShards = new Map<string, Record<string, unknown>>()
const chineseParts: Record<string, string> = { noun: '名词', verb: '动词', adjective: '形容词', adverb: '副词', pronoun: '代词', preposition: '介词', conjunction: '连词', interjection: '感叹词', determiner: '限定词', numeral: '数词', particle: '助词', suffix: '后缀', prefix: '前缀', phrase: '短语' }

export function englishShardKey(word: string): string {
  let hash = 2166136261
  for (const letter of word) hash = Math.imul(hash ^ letter.codePointAt(0)!, 16777619)
  return (hash >>> 0).toString(16).slice(-2).padStart(2, '0')
}

export function parseChineseMeanings(value: unknown): ChineseMeaning[] {
  const seen = new Set<string>()
  return array(value).slice(0, 80).flatMap(item => {
    if (!Array.isArray(item)) return []
    const translation = text(item[1], 350)
    if (!/\p{Script=Han}/u.test(translation) || seen.has(translation)) return []
    seen.add(translation)
    return [{ partOfSpeech: /\p{Script=Han}/u.test(text(item[0], 15)) ? text(item[0], 15) : '', translation }]
  })
}

async function lookupEnglishChinese(word: string, signal: AbortSignal): Promise<ChineseDictionaryResult | null> {
  const normalized = word.toLowerCase().replace(/’/g, "'")
  const key = englishShardKey(normalized)
  let shard = englishShards.get(key)
  if (!shard) {
    const response = await fetch(assetUrl(`dictionaries/en/${key}.json`), { signal, credentials: 'same-origin' })
    if (!response.ok) throw new Error('中文词库暂时没有加载成功，请重试。')
    const data: unknown = await response.json()
    if (!record(data)) throw new Error('中文词库暂时没有加载成功，请重试。')
    shard = data
    if (englishShards.size >= 8) englishShards.delete(englishShards.keys().next().value!)
    englishShards.set(key, shard)
  }
  if (!Object.hasOwn(shard, normalized)) return null
  const meanings = parseChineseMeanings(shard[normalized])
  return meanings.length ? { word, meanings, source: 'ecdict', sourceUrl: 'https://github.com/skywind3000/ECDICT' } : null
}

export async function lookupChineseDictionary(word: string, signal: AbortSignal): Promise<ChineseDictionaryResult | null> {
  if (dictionaryLanguage(word) === 'en') {
    const local = await lookupEnglishChinese(word, signal)
    if (!word.includes(' ')) {
      const normalized = word.toLowerCase()
      const key = englishShardKey(normalized)
      try {
        let forms = formShards.get(key)
        if (!forms) {
          const data = await readJson(assetUrl(`dictionaries/en-forms/${key}.json`), signal)
          if (record(data)) {
            forms = data
            if (formShards.size >= 8) formShards.delete(formShards.keys().next().value!)
            formShards.set(key, data)
          }
        }
        const bases = array(forms?.[normalized]).filter((base): base is string => typeof base === 'string' && base !== normalized).slice(0, 4)
        const supplements = await Promise.all(bases.map(base => lookupEnglishChinese(base, signal)))
        const meanings = [...(local?.meanings ?? [])]
        for (const result of supplements) if (result) {
          for (const meaning of result.meanings) if (!meanings.some(item => item.translation === meaning.translation && item.partOfSpeech === meaning.partOfSpeech)) {
            meanings.push({ ...meaning, headword: result.word })
          }
        }
        if (meanings.length) return { word, meanings, source: 'ecdict', sourceUrl: 'https://github.com/skywind3000/ECDICT' }
      } catch (problem) { if (signal.aborted) throw problem /* Keep exact entries usable if form index fails. */ }
    }
    if (local) return local
    if (word.includes(' ')) return null
  }
  const found = await lookupDictionary(word, signal)
  if (!found) return null
  const meanings: ChineseMeaning[] = []
  // Translate separate senses, rather than treating one word-level translation as its only meaning.
  let next = 0
  const completed: (ChineseMeaning | undefined)[] = []
  const candidates = found.meanings
  const worker = async () => {
    while (next < candidates.length && !signal.aborted) {
      const index = next++
      const meaning = candidates[index]
      const partOfSpeech = chineseParts[meaning.partOfSpeech] ?? ''
      if (meaning.chinese.length) { completed[index] = { partOfSpeech, translation: meaning.chinese.join('；') }; continue }
      let definition = meaning.definition.replace(/^[^:]{1,80}:\s*(?=[a-z])/u, '')
      while (new TextEncoder().encode(definition).length > 460) definition = definition.slice(0, -1)
      try {
        const parameters = new URLSearchParams({ q: definition, langpair: 'en|zh-CN' })
        const translation = parseReferenceTranslation(await readJson(`${TRANSLATION_API}?${parameters}`, signal))
        if (translation) completed[index] = { partOfSpeech, translation }
      } catch { /* Keep other senses usable if an individual translation is unavailable. */ }
    }
  }
  await Promise.all([worker(), worker(), worker()])
  const seen = new Set<string>()
  for (const meaning of completed) if (meaning && !seen.has(meaning.translation)) { seen.add(meaning.translation); meanings.push(meaning) }
  return meanings.length ? { word, meanings, source: 'translated', sourceUrl: found.sourceUrl } : null
}

export function lookupQuery(value: string): string {
  const query = value.trim().replace(/\s+/g, ' ')
  if (!query) throw new Error('先输入单词、短语或句子。')
  if (query.length > DICTIONARY_QUERY_LIMIT) throw new Error(`最多查询 ${DICTIONARY_QUERY_LIMIT} 个字符，请分成较短的句子。`)
  if (/https?:\/\/|www\.|[<>\u0000-\u001f]/iu.test(query) || !/\p{L}/u.test(query)) throw new Error('请输入要理解的文字，不含网址或代码标签。')
  return query
}

/** Provider accepts at most 500 UTF-8 bytes per request, not 500 characters. */
export function translationChunks(value: string): string[] {
  const chunks: string[] = []
  let remaining = value
  const encoder = new TextEncoder()
  while (remaining) {
    let piece = '', bytes = 0
    for (const char of remaining) {
      const size = encoder.encode(char).length
      if (bytes + size > 450) break
      piece += char; bytes += size
    }
    if (piece.length < remaining.length) {
      const boundary = Math.max(piece.lastIndexOf(' '), piece.lastIndexOf('。'), piece.lastIndexOf('. '))
      if (boundary > piece.length / 2) piece = piece.slice(0, boundary + 1)
    }
    chunks.push(piece.trim())
    remaining = remaining.slice(piece.length).trimStart()
  }
  return chunks
}

export async function translateReading(value: string, language: string, signal: AbortSignal): Promise<string> {
  const chunks = translationChunks(lookupQuery(value))
  const translations: string[] = []
  for (const chunk of chunks) {
    const translated = await lookupReferenceTranslation(chunk, signal, language.startsWith('ja') ? 'ja' : 'en')
    if (!translated) throw new Error('翻译服务暂时不可用或今日额度已用完，请稍后重试。')
    translations.push(translated)
  }
  return translations.join('\n')
}
