import { test } from 'node:test'
import assert from 'node:assert/strict'
import { voiceDescription, voiceLabel, voiceShortName } from './voiceLabels.ts'

test('Windows English voices have distinct descriptive names with checkable identities', () => {
  const mark = { name: 'Microsoft Mark - English (United States)', lang: 'en-US', voiceURI: 'original-mark-id' }
  assert.equal(voiceLabel(mark), '清朗青年音（Mark）')
  assert.equal(voiceLabel({ name: 'Microsoft David Desktop - English (United States)', lang: 'en-US' }), '沉稳大叔音（David）')
  assert.equal(voiceLabel({ name: 'Microsoft Zira - English (United States)', lang: 'en_US' }), '清晰女声（Zira）')
  assert.match(voiceDescription(mark), /Microsoft Mark - English \(United States\)/)
  assert.equal(mark.voiceURI, 'original-mark-id')
})

test('similar names and other providers do not inherit an unrelated voice nickname', () => {
  for (const name of ['Microsoft Markus - English', 'Microsoft Markdown', 'Other Provider Mark', 'Mark']) {
    assert.equal(voiceLabel({ name, lang: 'en-US' }), name)
  }
})

test('Japanese nicknames remain language-specific and unknown voices keep their names', () => {
  assert.equal(voiceShortName({ name: 'Microsoft Haruka - Japanese (Japan)', lang: 'ja-JP' }), '温和叙述音')
  assert.equal(voiceLabel({ name: 'Microsoft Haruka - Japanese (Japan)', lang: 'en-US' }), 'Microsoft Haruka - Japanese (Japan)')
  assert.equal(voiceLabel({ name: 'New English Voice', lang: 'en-US' }), 'New English Voice')
})

test('descriptions identify nicknames as listening references rather than real ages', () => {
  assert.match(voiceDescription({ name: 'Microsoft David - English (United States)', lang: 'en-US' }), /昵称供试听参考/)
  assert.equal(voiceShortName({ name: '', lang: '' }), '未命名声音')
})

test('Microsoft online natural names and neural short names receive readable labels', () => {
  const online = { name: 'Microsoft Aria Online (Natural) - English (United States)', lang: 'en-US', localService: false, voiceURI: 'unchanged-online-id' }
  assert.equal(voiceLabel(online), '清亮知性女声（Aria）')
  assert.equal(voiceShortName({ ...online, name: 'en-US-AriaNeural' }), '清亮知性女声')
  assert.equal(voiceShortName({ ...online, name: 'Microsoft AndrewMultilingual Online (Natural) - English (United States)' }), '温暖叙述男声')
  assert.equal(voiceShortName({ ...online, name: 'en-US-AndrewMultilingualNeural' }), '温暖叙述男声')
  assert.equal(voiceShortName({ name: 'Microsoft Nanami Online (Natural) - Japanese (Japan)', lang: 'ja-JP' }), '温柔清亮女声')
  assert.equal(online.voiceURI, 'unchanged-online-id')
  assert.match(voiceDescription(online), /Microsoft Aria Online \(Natural\)/)
})

test('Google online voices have distinct US, UK and Japanese names', () => {
  assert.equal(voiceLabel({ name: 'Google US English', lang: 'en-US', localService: false }), '清晰美式朗读（Google）')
  assert.equal(voiceLabel({ name: 'Google UK English Female', lang: 'en-GB', localService: false }), '柔和英伦女声（Google）')
  assert.equal(voiceLabel({ name: 'Google UK English Male', lang: 'en-GB', localService: false }), '沉稳英伦男声（Google）')
  assert.equal(voiceLabel({ name: 'Google 日本語', lang: 'ja-JP', localService: false }), '清晰日语朗读（Google）')
})

test('unknown online voices get neutral language guidance and keep their original name', () => {
  assert.equal(voiceLabel({ name: 'Future Cloud Voice', lang: 'en_GB', localService: false }), '英式英语在线朗读（Future Cloud Voice）')
  assert.equal(voiceShortName({ name: 'Future Voice', lang: 'ja-JP', localService: false }), '日语在线朗读')
  assert.equal(voiceShortName({ name: 'New English Voice', lang: 'en-US', localService: true }), 'New English Voice')
})

test('online nicknames do not leak across providers, partial tokens or language mismatches', () => {
  for (const name of ['Other Provider Aria', 'Microsoft Arianna Online (Natural)', 'Microsoft AriaPlus Online (Natural)']) {
    assert.doesNotMatch(voiceLabel({ name, lang: 'en-US', localService: false }), /清亮知性女声/)
  }
  assert.doesNotMatch(voiceLabel({ name: 'ja-JP-AriaNeural', lang: 'en-US', localService: false }), /清亮知性女声/)
  assert.doesNotMatch(voiceLabel({ name: 'en-US-AriaNeural', lang: 'ja-JP', localService: false }), /清亮知性女声/)
})
