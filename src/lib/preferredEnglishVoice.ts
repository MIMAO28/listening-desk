import type { VoiceLike } from './voiceLabels.ts'

export function isNaturalVoice(voice: VoiceLike) {
  return /\bNatural\b|Neural$|\bEnhanced\b|\bPremium\b/i.test(voice.name)
}

// Rank real available voices, never fabricate provider voices or rename a
// basic system voice as a natural/TOEFL voice.
export function englishVoiceChoices<T extends VoiceLike>(voices: readonly T[]): T[] {
  const score = (voice: T) => {
    const name = voice.name
    let value = isNaturalVoice(voice) ? 200 : 0
    if (voice.lang.toLowerCase().replaceAll('_', '-') === 'en-us') value += 50
    if (voice.localService) value += 70
    if (/^Microsoft Andrew(?:Multilingual)?\b/i.test(name)) value += 25
    else if (/^Microsoft Aria\b/i.test(name)) value += 24
    else if (/^Microsoft Guy\b/i.test(name)) value += 23
    else if (/^Microsoft Jenny\b/i.test(name)) value += 22
    else if (/^Alex(?:\s*\(|$)/i.test(name)) value += 18
    else if (/^Samantha(?:\s*\(|$)/i.test(name)) value += 17
    else if (/^Microsoft Mark(?: Desktop)?(?:\s*-|$)/i.test(name)) value += 3
    else if (/^Microsoft Zira(?: Desktop)?(?:\s*-|$)/i.test(name)) value += 2
    else if (/^Microsoft David(?: Desktop)?(?:\s*-|$)/i.test(name)) value += 1
    return value
  }
  return voices.filter(voice => /^en(?:[-_]|$)/i.test(voice.lang))
    .sort((a, b) => score(b) - score(a) || a.name.localeCompare(b.name))
}

export function preferredEnglishVoice<T extends VoiceLike>(voices: readonly T[]): T | undefined { return englishVoiceChoices(voices)[0] }
