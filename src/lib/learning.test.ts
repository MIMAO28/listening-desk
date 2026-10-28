import test from 'node:test'
import assert from 'node:assert/strict'
import { checkAnswer, dayKey, learningSummary, levelProgress } from './learning.ts'
import type { LearningSession } from './learning.ts'

test('matches the reference level formula at exact thresholds', () => {
  assert.equal(levelProgress(199).level, 1)
  assert.equal(levelProgress(200).level, 2)
  assert.equal(levelProgress(200).toNext, 566)
  assert.equal(levelProgress(765).level, 2)
  assert.equal(levelProgress(766).level, 3)
  assert.equal(levelProgress(-1).current, 0)
  assert.equal(levelProgress(NaN).current, 0)
})
test('one missing word does not mark all later words wrong', () => {
  const result = checkAnswer('Listen carefully to every sentence.', 'LISTEN to every sentence!', 'en-US')
  assert.equal(result.correct, 4)
  assert.equal(result.total, 5)
  assert.deepEqual(result.words.filter(w => !w.correct).map(w => w.text), ['carefully'])
})
test('duplicates, curly apostrophes and additional words are handled', () => {
  assert.equal(checkAnswer("It's a very very good day.", 'it’s a very good day', 'en-US').correct, 5)
  const extra = checkAnswer('Good morning.', 'very good morning', 'en-US')
  assert.equal(extra.extra, 1)
  assert.equal(extra.accuracy, 67)
  assert.equal(checkAnswer('今日は、晴れです。', '今日は晴れです', 'ja-JP').accuracy, 100)
})
test('learning dates use Shanghai and totals use the latest 30 days', () => {
  assert.equal(dayKey(new Date('2026-10-27T16:01:00Z')), '2026-10-28')
  const make = (day: string, points: number): LearningSession => ({ id: day, title: 'Test', language: 'en-US', study_day: day, duration_seconds: 60, sentence_count: 1, points, correct_words: points, total_words: 10, completed: true, updated_at: '' })
  const summary = learningSummary([make('2026-10-28', 5), make('2026-10-27', 10), make('2026-09-01', 3)], '2026-10-28')
  assert.equal(summary.streak, 2)
  assert.equal(summary.points, 18)
  assert.equal(summary.seconds, 120)
  assert.equal(summary.accuracy, 75)
})
