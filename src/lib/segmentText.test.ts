import { test } from 'node:test'
import assert from 'node:assert/strict'
import { cleanText, sentencesFromLines, splitIntoSentences, validateText } from './segmentText.ts'

test('honorifics and decimal points do not create unwanted sentence boundaries', () => {
  assert.deepEqual(splitIntoSentences('Dr. Smith paid 3.14 dollars. Was it enough? Yes!'),
    ['Dr. Smith paid 3.14 dollars.', 'Was it enough?', 'Yes!'])
})
test('paragraphs, BOM, CRLF, and Japanese punctuation are handled', () => {
  assert.equal(cleanText('\uFEFF A.\r\nB. '), 'A.\nB.')
  assert.deepEqual(splitIntoSentences('朝です。\n散歩します！本当？', 'ja-JP'), ['朝です。', '散歩します！', '本当？'])
})
test('manual correction treats each nonempty line as one sentence', () => {
  assert.deepEqual(sentencesFromLines(' First. Second.\n\nThird. '), ['First. Second.', 'Third.'])
})
test('empty and oversized material are rejected', () => {
  assert.throws(() => validateText(' \n '), /先粘贴/)
  assert.throws(() => validateText('a'.repeat(20001)), /20,000/)
})
