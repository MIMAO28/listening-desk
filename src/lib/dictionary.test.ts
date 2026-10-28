import assert from 'node:assert/strict'
import test from 'node:test'
import { dictionaryLanguage, dictionaryQuery, lookupQuery, translationChunks, parseDictionaryResult, parseReferenceTranslation, youdaoUrl } from './dictionary.ts'

test('dictionary input accepts short English and Japanese selections while rejecting full material and URLs', () => {
  assert.equal(dictionaryQuery('  “take   over.” '), 'take over')
  assert.equal(dictionaryQuery("don't"), "don't")
  assert.equal(dictionaryQuery('散歩'), '散歩')
  assert.equal(dictionaryLanguage('散歩'), 'ja')
  assert.equal(dictionaryLanguage('route'), 'en')
  for (const invalid of ['', 'https://example.com', '<script>', 'a '.repeat(9), 'a'.repeat(81)]) {
    assert.throws(() => dictionaryQuery(invalid))
  }
})

test('dictionary parsing keeps useful senses and the matching Chinese translations as plain text', () => {
  const result = parseDictionaryResult({ word: 'route', source: { url: 'javascript:bad' }, entries: [{
    partOfSpeech: 'noun', pronunciations: [{ type: 'ipa', text: '/ɹuːt/' }], senses: [{
      definition: 'A course or way which is traveled or passed.', examples: ['Choose a different route.'],
      translations: [{ language: { code: 'zh' }, word: '路線' }, { language: { code: 'fr' }, word: 'route' }],
    }],
  }] }, 'route')
  assert.equal(result?.phonetic, '/ɹuːt/')
  assert.equal(result?.meanings[0].partOfSpeech, 'noun')
  assert.equal(result?.meanings[0].example, 'Choose a different route.')
  assert.deepEqual(result?.meanings[0].chinese, ['路線'])
  assert.equal(result?.sourceUrl, 'https://en.wiktionary.org/wiki/route')
})

test('malformed or empty dictionary responses do not produce fabricated meanings', () => {
  for (const invalid of [null, [], {}, { entries: [null, { senses: [false, {}] }] }]) {
    assert.equal(parseDictionaryResult(invalid, 'word'), null)
  }
  const result = parseDictionaryResult({ entries: [{ senses: [{ definition: '<b>plain text</b>' }] }] }, 'word')
  assert.equal(result?.meanings[0].definition, '<b>plain text</b>')
})

test('nested dictionary categories yield real modern definitions before old senses and retain child examples and translations', () => {
  const result = parseDictionaryResult({ word: 'subtle', entries: [{ partOfSpeech: 'adjective', senses: [
    { definition: 'Senses relating to tangible things.', subsenses: [
      { definition: 'Very delicate or slight, and thus barely noticeable.', examples: ['A subtle movement.'],
        translations: [{ language: { code: 'zh' }, word: '細微的' }] },
      ...Array.from({ length: 7 }, (_, index) => ({ definition: `(archaic) Old meaning ${index}.`, tags: ['archaic'] })),
    ] },
    { definition: 'Senses relating to intangible things.', subsenses: [
      { definition: 'Concepts.', subsenses: [{ definition: 'Not easily understood or obvious.' }] },
      { definition: 'Giving only a slight impression; understated.',
        examples: ['The difference between the tones is subtle.'] },
    ] },
  ] }] }, 'subtle')
  assert.ok(result)
  assert.equal(result.meanings.length, 5)
  assert.equal(result.meanings[0].definition, 'Very delicate or slight, and thus barely noticeable.')
  assert.equal(result.meanings[0].partOfSpeech, 'adjective')
  assert.equal(result.meanings[0].example, 'A subtle movement.')
  assert.deepEqual(result.meanings[0].chinese, ['細微的'])
  assert.equal(result.meanings[1].definition, 'Not easily understood or obvious.')
  assert.equal(result.meanings[2].example, 'The difference between the tones is subtle.')
  assert.ok(result.meanings.every(meaning => !meaning.definition.startsWith('Senses relating') && meaning.definition !== 'Concepts.'))
  assert.ok(result.meanings[3].definition.startsWith('(archaic)'))
})

test('dictionary results are bounded and links never use URLs supplied by the service', () => {
  const result = parseDictionaryResult({ entries: [{
    senses: Array.from({ length: 20 }, () => ({ definition: 'x'.repeat(1000), examples: ['y'.repeat(1000)] })),
  }] }, 'take over')
  assert.equal(result?.meanings.length, 5)
  assert.equal(result?.meanings[0].definition.length, 700)
  assert.equal(result?.meanings[0].example.length, 450)
  assert.equal(result?.sourceUrl, 'https://en.wiktionary.org/wiki/take%20over')
  assert.ok(youdaoUrl('word&lang=evil').includes('word%26lang%3Devil'))
})

test('reference translations reject quota failures and non-Chinese responses', () => {
  assert.equal(parseReferenceTranslation({ responseStatus: 200, responseData: { translatedText: '道路' } }), '道路')
  assert.equal(parseReferenceTranslation({ responseStatus: 429, responseData: { translatedText: '配额用完' } }), '')
  assert.equal(parseReferenceTranslation({ responseStatus: 200, quotaFinished: true, responseData: { translatedText: '额度已满' } }), '')
  assert.equal(parseReferenceTranslation({ responseStatus: 200, responseData: { translatedText: 'QUERY LIMIT EXCEEDED' } }), '')
  assert.equal(parseReferenceTranslation({ responseStatus: 200, responseData: {} }), '')
})

test('reading lookup accepts complete sentences and numbers without allowing URLs or markup', () => {
  assert.equal(lookupQuery('  Could you cover my shift at 10:30?  '), 'Could you cover my shift at 10:30?')
  assert.equal(lookupQuery('これは、私が読んだ論文です。'), 'これは、私が読んだ論文です。')
  for (const invalid of ['', 'https://example.com', '<script>', 'x'.repeat(1001)]) assert.throws(() => lookupQuery(invalid))
})

test('long translations preserve full Unicode text within provider byte limits', () => {
  for (const input of ['This is an interesting sentence. '.repeat(25).trim(), 'これは論文の内容を説明する文章です。'.repeat(25)]) {
    const chunks = translationChunks(input)
    assert.ok(chunks.length > 1)
    assert.ok(chunks.every(chunk => new TextEncoder().encode(chunk).length <= 450))
    assert.equal(chunks.join('').replace(/\s/g, ''), input.replace(/\s/g, ''))
    assert.ok(chunks.every(chunk => !chunk.includes('\uFFFD')))
  }
})
