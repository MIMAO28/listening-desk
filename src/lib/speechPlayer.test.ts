import { test } from 'node:test'
import assert from 'node:assert/strict'
import { SpeechPlayer } from './speechPlayer.ts'
import type { Clock, SpeechPort, SpeechSettings } from './speechPlayer.ts'

function setup() {
  const calls: { text: string; settings: SpeechSettings; end: () => void; error: (message: string) => void }[] = []
  let paused = 0
  let resumed = 0
  let pauseAction: (() => void) | undefined
  const timers = new Map<number, () => void>()
  let nextTimer = 0
  const clock: Clock = {
    schedule(callback) { const handle = ++nextTimer; timers.set(handle, callback); return handle },
    clear(handle) { timers.delete(handle as number) },
  }
  const port: SpeechPort = {
    speak(text, settings, end, error) { calls.push({ text, settings, end, error }) },
    pause() { paused++; pauseAction?.() }, resume() { resumed++ }, cancel() {},
  }
  const player = new SpeechPlayer(port, clock)
  const settings: SpeechSettings = { language: 'en-US', voiceURI: 'test', rate: 1 }
  const tick = () => { const pending = [...timers.values()]; timers.clear(); pending.forEach(callback => callback()) }
  return { player, calls, timers, settings, tick, pauses: () => paused, resumes: () => resumed,
    onPause: (action: () => void) => { pauseAction = action } }
}

test('a normal sentence stops and does not schedule another utterance', () => {
  const { player, calls, settings, timers } = setup()
  player.play('First.', settings)
  calls[0].end()
  assert.equal(player.getSnapshot().status, 'idle')
  assert.equal(timers.size, 0)
  assert.equal(calls.length, 1)
})
test('repeat plays exactly three times and leaves no scheduled replay', () => {
  const { player, calls, settings, tick, timers } = setup()
  player.play('Repeat.', settings, 3)
  for (let i = 0; i < 3; i++) {
    assert.equal(player.getSnapshot().iteration, i + 1)
    calls[i].end()
    tick()
  }
  assert.equal(calls.length, 3)
  assert.equal(player.getSnapshot().status, 'idle')
  assert.equal(timers.size, 0)
})
test('switching sentences invalidates stale completion and error callbacks', () => {
  const { player, calls, settings, tick } = setup()
  player.play('Old.', settings, 3)
  const old = calls[0]
  player.play('New.', settings)
  old.end(); old.error('stale'); tick()
  assert.equal(calls.length, 2)
  assert.equal(calls[1].text, 'New.')
  assert.equal(player.getSnapshot().status, 'playing')
  assert.equal(player.getSnapshot().error, null)
})
test('pausing a repeat gap blocks the next repeat until resumed', () => {
  const { player, calls, settings, tick } = setup()
  player.play('Gap.', settings, 3)
  calls[0].end()
  player.pause(); tick()
  assert.equal(player.getSnapshot().status, 'paused')
  assert.equal(calls.length, 1)
  player.resume(); tick()
  assert.equal(calls.length, 2)
  assert.equal(player.getSnapshot().iteration, 2)
})
test('pause and resume during an utterance use the speech engine', () => {
  const { player, calls, settings, pauses, resumes } = setup()
  player.play('Pause.', settings)
  player.pause(); player.resume()
  assert.equal(pauses(), 1); assert.equal(resumes(), 1)
  assert.equal(calls.length, 1)
})
test('changing speed while paused stays silent, then restarts with the new speed', () => {
  const { player, calls, settings } = setup()
  player.play('Slow.', settings, 3)
  player.pause()
  player.reconfigure({ ...settings, rate: 0.75 })
  assert.equal(calls.length, 1)
  assert.equal(player.getSnapshot().status, 'paused')
  player.resume()
  assert.equal(calls.length, 2)
  assert.equal(calls[1].settings.rate, 0.75)
  assert.equal(player.getSnapshot().iteration, 1)
})
test('stop while waiting cancels scheduled work and old callbacks', () => {
  const { player, calls, settings, tick } = setup()
  player.play('Stop.', settings, 3)
  calls[0].end(); player.stop(); tick(); calls[0].end()
  assert.equal(calls.length, 1)
  assert.equal(player.getSnapshot().status, 'idle')
})
test('a speech error does not schedule a repeated utterance', () => {
  const { player, calls, settings, tick } = setup()
  player.play('Error.', settings, 3)
  calls[0].error('Voice unavailable'); tick()
  calls[0].end(); tick()
  assert.equal(calls.length, 1)
  assert.equal(player.getSnapshot().error, 'Voice unavailable')
  assert.equal(player.getSnapshot().status, 'error')
})

test('continuous playback starts at the selected sentence and stops at the final sentence', () => {
  const { player, calls, settings, tick, timers } = setup()
  player.playAll(['First.', 'Second.', 'Third.'], settings, 1)
  assert.equal(player.getSnapshot().mode, 'continuous')
  assert.equal(player.getSnapshot().sentenceIndex, 1)
  assert.equal(calls[0].text, 'Second.')
  calls[0].end(); tick()
  assert.equal(player.getSnapshot().sentenceIndex, 2)
  assert.equal(calls[1].text, 'Third.')
  calls[1].end(); tick()
  assert.equal(player.getSnapshot().status, 'idle')
  assert.equal(player.getSnapshot().sentenceIndex, 2)
  assert.equal(calls.length, 2)
  assert.equal(timers.size, 0)
})

test('continuous playback copies its sentence queue before external edits', () => {
  const { player, calls, settings, tick } = setup()
  const sentences = ['First.', 'Second.']
  player.playAll(sentences, settings)
  sentences[1] = 'Changed outside the player.'
  sentences.push('Extra.')
  calls[0].end(); tick()
  assert.equal(calls[1].text, 'Second.')
  calls[1].end(); tick()
  assert.equal(calls.length, 2)
  assert.equal(player.getSnapshot().status, 'idle')
})

test('continuous pause during a sentence gap waits for resume without skipping a sentence', () => {
  const { player, calls, settings, tick, pauses } = setup()
  player.playAll(['First.', 'Second.'], settings)
  calls[0].end()
  player.pause(); tick()
  assert.equal(player.getSnapshot().status, 'paused')
  assert.equal(player.getSnapshot().sentenceIndex, 0)
  assert.equal(calls.length, 1)
  assert.equal(pauses(), 0)
  player.resume(); tick()
  assert.equal(calls[1].text, 'Second.')
  assert.equal(player.getSnapshot().sentenceIndex, 1)
})

test('an end callback delivered synchronously during pause does not advance until resume', () => {
  const { player, calls, settings, tick, resumes, onPause } = setup()
  player.playAll(['First.', 'Second.'], settings)
  onPause(() => calls[0].end())
  player.pause(); tick()
  assert.equal(calls.length, 1)
  assert.equal(player.getSnapshot().status, 'paused')
  player.resume(); tick()
  assert.equal(calls[1].text, 'Second.')
  assert.equal(resumes(), 0)
})

test('stopping continuous playback cancels queued sentences and stale callbacks', () => {
  const { player, calls, settings, tick } = setup()
  player.playAll(['First.', 'Second.'], settings)
  calls[0].end()
  player.stop(); tick()
  calls[0].end(); calls[0].error('old error'); tick()
  assert.equal(calls.length, 1)
  assert.equal(player.getSnapshot().mode, 'single')
  assert.equal(player.getSnapshot().sentenceIndex, null)
  assert.equal(player.getSnapshot().status, 'idle')
})

test('switching to repeat mode cancels the remainder of a continuous queue', () => {
  const { player, calls, settings, tick } = setup()
  player.playAll(['Old first.', 'Old second.'], settings)
  calls[0].end()
  player.play('Repeat me.', settings, 3)
  calls[0].end(); tick()
  assert.equal(player.getSnapshot().mode, 'single')
  assert.equal(player.getSnapshot().sentenceIndex, null)
  for (let index = 1; index <= 3; index++) { calls[index].end(); tick() }
  assert.deepEqual(calls.map(call => call.text), ['Old first.', 'Repeat me.', 'Repeat me.', 'Repeat me.'])
  assert.equal(player.getSnapshot().status, 'idle')
})

test('a continuous speech error stops the queue even when end arrives afterwards', () => {
  const { player, calls, settings, tick } = setup()
  player.playAll(['First.', 'Second.'], settings)
  calls[0].error('Offline voice failed'); calls[0].end(); tick()
  player.resume(); tick()
  assert.equal(calls.length, 1)
  assert.equal(player.getSnapshot().status, 'error')
  assert.equal(player.getSnapshot().error, 'Offline voice failed')
})

test('changing continuous speed restarts the current sentence and retains the remaining queue', () => {
  const { player, calls, settings, tick } = setup()
  player.playAll(['First.', 'Second.', 'Third.'], settings)
  calls[0].end(); tick()
  player.reconfigure({ ...settings, rate: 0.75 })
  assert.equal(calls[2].text, 'Second.')
  assert.equal(calls[2].settings.rate, 0.75)
  assert.equal(player.getSnapshot().sentenceIndex, 1)
  calls[1].end(); calls[1].error('cancelled'); tick()
  assert.equal(calls.length, 3)
  calls[2].end(); tick()
  assert.equal(calls[3].text, 'Third.')
  assert.equal(calls[3].settings.rate, 0.75)
  assert.equal(player.getSnapshot().sentenceIndex, 2)
})

test('changing settings during continuous pause stays silent and resumes at the current sentence', () => {
  const { player, calls, settings, tick } = setup()
  player.playAll(['First.', 'Second.', 'Third.'], settings, 1)
  player.pause()
  player.reconfigure({ ...settings, rate: 1.5, voiceURI: 'new voice' })
  tick()
  assert.equal(calls.length, 1)
  assert.equal(player.getSnapshot().status, 'paused')
  assert.equal(player.getSnapshot().mode, 'continuous')
  assert.equal(player.getSnapshot().sentenceIndex, 1)
  player.resume()
  assert.equal(calls[1].text, 'Second.')
  assert.equal(calls[1].settings.voiceURI, 'new voice')
  assert.equal(calls[1].settings.rate, 1.5)
  calls[1].end(); tick()
  assert.equal(calls[2].text, 'Third.')
})

test('empty continuous queues and invalid start positions stop safely without fabricated indices', () => {
  for (const [sentences, index] of [
    [[], 0], [[''], 0], [['First.'], -1], [['First.'], 1], [['First.'], 0.5], [['First.'], Number.NaN],
  ] as const) {
    const { player, calls, settings, tick } = setup()
    player.playAll(['Before.', 'After.'], settings)
    player.playAll(sentences, settings, index)
    calls[0].end(); tick()
    assert.equal(calls.length, 1)
    assert.equal(player.getSnapshot().status, 'idle')
    assert.equal(player.getSnapshot().sentenceIndex, null)
  }
})

test('duplicate completion callbacks do not skip continuous sentences or replay them', () => {
  const { player, calls, settings, tick } = setup()
  player.playAll(['First.', 'Second.', 'Third.'], settings)
  calls[0].end(); calls[0].end(); tick()
  calls[0].error('late old error'); tick()
  assert.equal(calls.length, 2)
  assert.equal(player.getSnapshot().sentenceIndex, 1)
  calls[1].end(); calls[1].end(); tick()
  calls[2].end(); tick()
  assert.deepEqual(calls.map(call => call.text), ['First.', 'Second.', 'Third.'])
  assert.equal(player.getSnapshot().status, 'idle')
})

test('a cancelled gap callback cannot advance a newly resumed continuous queue', () => {
  const { player, calls, settings, timers, tick } = setup()
  player.playAll(['First.', 'Second.', 'Third.'], settings)
  calls[0].end()
  const cancelledGap = [...timers.values()][0]
  player.pause(); player.resume()
  cancelledGap()
  assert.equal(calls.length, 1)
  assert.equal(player.getSnapshot().sentenceIndex, 0)
  tick()
  assert.equal(calls.length, 2)
  assert.equal(player.getSnapshot().sentenceIndex, 1)
})

test('continuous three-repeat mode plays every sentence three times and resets its counter', () => {
  const { player, calls, settings, tick, timers } = setup()
  player.playAll(['First.', 'Second.', 'Third.'], settings, 0, 3)
  for (let i = 0; i < 9; i++) {
    assert.equal(calls[i].text, ['First.', 'Second.', 'Third.'][Math.floor(i / 3)])
    assert.equal(player.getSnapshot().iteration, i % 3 + 1)
    assert.equal(player.getSnapshot().sentenceIndex, Math.floor(i / 3))
    calls[i].end(); calls[i].end(); tick()
  }
  assert.equal(calls.length, 9)
  assert.equal(player.getSnapshot().status, 'idle')
  assert.equal(timers.size, 0)
})

test('pausing the third repeat blocks advancing to the next sentence until resume', () => {
  const { player, calls, settings, tick } = setup()
  player.playAll(['First.', 'Second.'], settings, 0, 3)
  calls[0].end(); tick(); calls[1].end(); tick()
  player.pause(); calls[2].end(); tick()
  assert.equal(calls.length, 3)
  assert.equal(player.getSnapshot().status, 'paused')
  assert.equal(player.getSnapshot().sentenceIndex, 0)
  player.resume(); tick()
  assert.equal(calls[3].text, 'Second.')
  assert.equal(player.getSnapshot().iteration, 1)
})

test('reconfiguring speed retains three repetitions for every remaining sentence', () => {
  const { player, calls, settings, tick } = setup()
  player.playAll(['First.', 'Second.'], settings, 0, 3)
  player.reconfigure({ ...settings, rate: 1.5 })
  calls[0].end(); tick()
  assert.equal(calls.length, 2)
  for (let i = 1; i <= 6; i++) { assert.equal(calls[i].settings.rate, 1.5); calls[i].end(); tick() }
  assert.deepEqual(calls.slice(1).map(c => c.text), ['First.', 'First.', 'First.', 'Second.', 'Second.', 'Second.'])
})

test('changing repeat mode while paused queues a silent restart until resume', () => {
  const { player, calls, settings, tick } = setup()
  player.playAll(['First.', 'Second.'], settings, 1, 3, true)
  tick()
  assert.equal(calls.length, 0)
  assert.equal(player.getSnapshot().status, 'paused')
  player.resume()
  assert.equal(calls[0].text, 'Second.')
  assert.equal(player.getSnapshot().total, 3)
})

test('manually skipping a repeat queue submits the new sentence without a gap timer', () => {
  const { player, calls, settings, tick, timers } = setup()
  player.playAll(['First.', 'Second.'], settings, 0, 3)
  calls[0].end()
  assert.equal(timers.size, 1)
  player.playAll(['First.', 'Second.'], settings, 1, 3)
  assert.equal(timers.size, 0)
  assert.equal(calls[1].text, 'Second.')
  calls[0].end(); tick()
  assert.equal(calls.length, 2)
  assert.equal(player.getSnapshot().iteration, 1)
})
