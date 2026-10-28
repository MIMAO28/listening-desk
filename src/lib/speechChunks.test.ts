import test from 'node:test'
import assert from 'node:assert/strict'
import { speechChunks } from './speechChunks.ts'
test('short speech text keeps its full sentence and long text loses no words', () => {
  assert.deepEqual(speechChunks('Listen to this sentence.'), ['Listen to this sentence.'])
  const text = ('This paper examines language, cognition, and the role of memory in learning. ').repeat(30).trim()
  const chunks = speechChunks(text)
  assert.equal(chunks.join(' '), text)
  assert.ok(chunks.every(chunk => chunk.length <= 240))
  assert.equal(speechChunks('a'.repeat(600)).join(''), 'a'.repeat(600))
})
