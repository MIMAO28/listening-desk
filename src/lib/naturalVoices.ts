export const NATURAL_VOICES = [
  { id: 'af_heart', name: 'Heart · 温润女声 · 美式' },
  { id: 'af_bella', name: 'Bella · 明亮女声 · 美式' },
  { id: 'am_michael', name: 'Michael · 沉稳男声 · 美式' },
  { id: 'am_fenrir', name: 'Fenrir · 清晰男声 · 美式' },
  { id: 'bf_emma', name: 'Emma · 柔和女声 · 英式' },
  { id: 'bf_isabella', name: 'Isabella · 清朗女声 · 英式' },
  { id: 'bm_george', name: 'George · 醇厚男声 · 英式' },
  { id: 'bm_fable', name: 'Fable · 叙述男声 · 英式' },
] as const
export function naturalVoiceId(uri: string) {
  const id = uri.replace(/^kokoro:/, '')
  return uri.startsWith('kokoro:') && NATURAL_VOICES.some(v => v.id === id) ? id as typeof NATURAL_VOICES[number]['id'] : null
}
export const naturalVoiceChoices = (): SpeechSynthesisVoice[] => NATURAL_VOICES.map(v => ({
  voiceURI: `kokoro:${v.id}`, name: v.name, lang: v.id.startsWith('b') ? 'en-GB' : 'en-US',
  localService: true, default: v.id === 'af_heart',
}))
