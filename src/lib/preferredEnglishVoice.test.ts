import { test } from 'node:test'
import assert from 'node:assert/strict'
import { preferredEnglishVoice, englishVoiceChoices, isNaturalVoice } from './preferredEnglishVoice.ts'

test('available natural US voices are preferred without hiding other choices', () => {
  const voices = [
    { name: 'Microsoft Mark - English (United States)', lang: 'en-US', localService: true },
    { name: 'Microsoft David Desktop - English (United States)', lang: 'en-US', localService: true },
    { name: 'Microsoft Andrew Online (Natural) - English (United States)', lang: 'en-US', localService: false },
  ]
  assert.equal(preferredEnglishVoice(voices)?.name, voices[2].name)
  assert.equal(preferredEnglishVoice([...voices].reverse())?.name, voices[2].name)
  assert.equal(englishVoiceChoices(voices).length, 3)
  assert.equal(isNaturalVoice(voices[0]), false)
  assert.equal(isNaturalVoice(voices[2]), true)
})

test('a local voice beats an online US voice and other languages are never selected', () => {
  const local = { name: 'Local English', lang: 'en-GB', localService: true }
  assert.equal(preferredEnglishVoice([
    { name: 'Microsoft David', lang: 'ja-JP', localService: true },
    { name: 'Cloud US', lang: 'en-US', localService: false }, local,
  ]), local)
  assert.equal(preferredEnglishVoice([{ name: '日语', lang: 'ja-JP', localService: true }]), undefined)
})

test('mobile and online-only devices still get one available English voice', () => {
  assert.equal(preferredEnglishVoice([{ name: 'Samantha', lang: 'en_US', localService: true }])?.name, 'Samantha')
  assert.equal(preferredEnglishVoice([{ name: 'Cloud US', lang: 'en-US', localService: false }])?.name, 'Cloud US')
})
