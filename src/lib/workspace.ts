import type { Material, Workspace } from '../types.ts'

export const RATES = [0.75, 1, 1.25, 1.5] as const
export const LANGUAGES = [{ value: 'en-US', label: '英语' }, { value: 'ja-JP', label: '日语' }] as const

export function makeMaterial(title: string, language: string, sourceText: string, lines: string[]): Material {
  return {
    id: crypto.randomUUID(), title: title.trim().slice(0, 120) || '未命名材料', language, sourceText,
    sentences: lines.map(text => ({ id: crypto.randomUUID(), text })),
    draftText: '', currentIndex: 0, updatedAt: new Date().toISOString(),
  }
}
export function initialWorkspace(): Workspace {
  const lines = [
    'I took a different route to the library this morning.',
    'The quiet streets gave me time to think about my plans.',
    'Sometimes a small change helps us notice something new.',
  ]
  const sample = makeMaterial('A small change of plan', 'en-US', lines.join('\n'), lines)
  const japanese = ['朝の静かな時間に、少しだけ散歩をしました。', 'いつもと違う道を歩くと、新しい景色に気づきます。', '小さな変化が、一日を少し豊かにしてくれます。']
  const japaneseSample = makeMaterial('いつもと違う道', 'ja-JP', japanese.join('\n'), japanese)
  return { schemaVersion: 1, materials: [sample, japaneseSample], activeId: sample.id,
    preferences: { voiceURI: '', rate: 1, transcriptHidden: false, theme: 'light', colorTheme: 'hues-17' } }
}
