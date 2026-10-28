import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { englishShardKey, parseChineseMeanings } from './dictionary.ts'
import { routeFromHash } from './navigation.ts'

test('bundled bilingual entries retain distinct Chinese meanings across parts of speech', async () => {
  for (const word of ['bank', 'run', 'street', 'light']) {
    const data = JSON.parse(await readFile(new URL(`../../public/dictionaries/en/${englishShardKey(word)}.json`, import.meta.url), 'utf8'))
    const meanings = parseChineseMeanings(data[word])
    assert.ok(meanings.length > 1, `${word} must keep more than its most common translation`)
    assert.ok(meanings.every(meaning => /\p{Script=Han}/u.test(meaning.translation)))
  }
})

test('Chinese results reject English-only and malformed rows while preserving all distinct senses', () => {
  const meanings = parseChineseMeanings([['noun', 'English definition only'], null, {}, ['名词', '银行'], ['名词', '银行'],
    ...Array.from({ length: 12 }, (_, index) => ['动词', `不同中文词义${index}`])])
  assert.equal(meanings.length, 13)
  assert.equal(meanings[0].translation, '银行')
})

test('only explicit language routes enter a practice page', () => {
  assert.equal(routeFromHash(''), 'home')
  assert.equal(routeFromHash('#/'), 'home')
  assert.equal(routeFromHash('#/practice/en'), 'en')
  assert.equal(routeFromHash('#/practice/ja'), 'ja')
  assert.equal(routeFromHash('#/practice/unknown'), 'home')
})

test('inflection index resolves real plural and irregular forms to full dictionary entries', async () => {
  for (const [word, root] of [['friends', 'friend'], ['went', 'go'], ['measured', 'measure'], ['speaking', 'speak']]) {
    const forms = JSON.parse(await readFile(new URL(`../../public/dictionaries/en-forms/${englishShardKey(word)}.json`, import.meta.url), 'utf8'))
    assert.ok(forms[word].includes(root), `${word} should resolve to ${root}`)
    const shard = JSON.parse(await readFile(new URL(`../../public/dictionaries/en/${englishShardKey(root)}.json`, import.meta.url), 'utf8'))
    assert.ok(parseChineseMeanings(shard[root]).length > 1, `${root} should retain its distinct senses`)
  }
})
