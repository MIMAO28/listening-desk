import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { createHash } from 'node:crypto'

const input = new URL('../output/dictionary-source/ecdict.csv', import.meta.url)
const destination = new URL('../public/dictionaries/', import.meta.url)
const csv = await readFile(input, 'utf8')
const groups = new Map()
const forms = new Map()
let fields = [], field = '', quoted = false, rowCount = 0, wordCount = 0
const partNames = { n: '名词', v: '动词', vt: '及物动词', vi: '不及物动词', a: '形容词', adj: '形容词', ad: '副词', adv: '副词', prep: '介词', pron: '代词', conj: '连词', num: '数词', art: '冠词', int: '感叹词', interj: '感叹词', aux: '助动词', det: '限定词' }
function hash(word) { let value = 2166136261; for (const letter of word) value = Math.imul(value ^ letter.codePointAt(0), 16777619); return (value >>> 0).toString(16).slice(-2).padStart(2, '0') }
function splitSenses(line) {
  const result = []; let current = '', depth = 0
  for (const char of line) {
    if ('(（['.includes(char)) depth++
    if (')）]'.includes(char)) depth = Math.max(0, depth - 1)
    if (!depth && /[,;，；]/u.test(char)) { if (current.trim()) result.push(current.trim()); current = '' } else current += char
  }
  if (current.trim()) result.push(current.trim())
  return result
}
function consume(row) {
  if (++rowCount === 1) return
  const word = row[0]?.trim().toLowerCase().replace(/\s+/g, ' ')
  if (!word || word.length > 80 || !/^[a-z][a-z\s'’\-]*$/u.test(word)) return
  const addForm = (form, base) => {
    if (form === base || !/^[a-z][a-z'\-]*$/.test(form) || !/^[a-z][a-z'\-]*$/.test(base)) return
    const bases = forms.get(form) ?? new Set()
    bases.add(base); forms.set(form, bases)
  }
  for (const exchange of (row[10] ?? '').split('/')) {
    const [kind, value] = exchange.split(':')
    if (kind === '0' && value) addForm(word, value.toLowerCase())
    else if (['p', 'd', 'i', '3', 'r', 't', 's'].includes(kind) && value) addForm(value.toLowerCase(), word)
  }
  const senses = [], seen = new Set()
  for (let line of (row[3] ?? '').replace(/\\n/g, '\n').split(/\r?\n/)) {
    line = line.trim(); const match = line.match(/^([a-z]+)\.\s*/i); const part = match ? partNames[match[1].toLowerCase()] ?? '' : ''
    if (match) line = line.slice(match[0].length)
    for (const meaning of splitSenses(line)) {
      if (!/\p{Script=Han}/u.test(meaning) || meaning.length > 350 || seen.has(meaning)) continue
      seen.add(meaning); senses.push([part, meaning])
    }
  }
  if (!senses.length) return
  const key = hash(word)
  if (!groups.has(key)) groups.set(key, Object.create(null))
  const group = groups.get(key)
  if (!group[word]) { group[word] = senses.slice(0, 80); wordCount++ }
}
for (let index = 0; index < csv.length; index++) {
  const char = csv[index]
  if (char === '"') { if (quoted && csv[index + 1] === '"') { field += '"'; index++ } else quoted = !quoted }
  else if (char === ',' && !quoted) { fields.push(field); field = '' }
  else if (char === '\n' && !quoted) { fields.push(field.replace(/\r$/, '')); consume(fields); fields = []; field = '' }
  else field += char
}
if (field || fields.length) { fields.push(field); consume(fields) }
await mkdir(new URL('en/', destination), { recursive: true })
await mkdir(new URL('en-forms/', destination), { recursive: true })
const formGroups = new Map(Array.from({ length: 256 }, (_, i) => [i.toString(16).padStart(2, '0'), Object.create(null)]))
for (const [word, bases] of forms) formGroups.get(hash(word))[word] = [...bases].filter(base => groups.get(hash(base))?.[base]).slice(0, 4)
for (const [key, data] of formGroups) await writeFile(new URL(`en-forms/${key}.json`, destination), JSON.stringify(data))
let totalBytes = 0
for (const [key, data] of groups) { const encoded = JSON.stringify(data); totalBytes += Buffer.byteLength(encoded); await writeFile(new URL(`en/${key}.json`, destination), encoded) }
await writeFile(new URL('ECDICT-LICENSE.txt', destination), await readFile(new URL('../output/dictionary-source/ECDICT-LICENSE', import.meta.url)))
const manifest = { source: 'https://github.com/skywind3000/ECDICT', license: 'MIT', sourceSha256: createHash('sha256').update(csv).digest('hex'), words: wordCount, shards: groups.size, bytes: totalBytes, inflectedForms: forms.size, inflectionShards: formGroups.size }
await writeFile(new URL('manifest.json', destination), JSON.stringify(manifest, null, 2))
console.log(JSON.stringify(manifest))
