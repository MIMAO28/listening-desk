import { test } from 'node:test'
import assert from 'node:assert/strict'
import { initialWorkspace } from './workspace.ts'

test('a fresh practice session does not inherit previous answers, position, materials, or settings', () => {
  const previous = initialWorkspace()
  previous.materials[0].draftText = 'An answer from the previous visit.'
  previous.materials[0].currentIndex = 2
  previous.preferences.theme = 'dark'
  previous.preferences.rate = 1.5
  previous.preferences.transcriptHidden = true
  previous.preferences.voiceURI = 'previous-voice'
  previous.materials.push({ ...previous.materials[0], id: crypto.randomUUID(), title: 'Imported earlier' })

  const fresh = initialWorkspace()
  assert.equal(fresh.materials.length, 2)
  assert.equal(fresh.materials[1].language, 'ja-JP')
  assert.ok(fresh.materials[1].sentences.every(sentence => /[\p{Script=Hiragana}\p{Script=Katakana}]/u.test(sentence.text)))
  assert.notEqual(fresh.activeId, previous.activeId)
  assert.equal(fresh.activeId, fresh.materials[0].id)
  assert.equal(fresh.materials[0].draftText, '')
  assert.equal(fresh.materials[0].currentIndex, 0)
  assert.equal(fresh.materials[0].sentences.length, 3)
  assert.deepEqual(fresh.preferences, {
    voiceURI: '', rate: 1, transcriptHidden: false, theme: 'light', colorTheme: 'hues-17',
  })
})
