export const LEVEL_TITLES = ['Beginner', 'Novice', 'Learner', 'Apprentice', 'Scholar', 'Practitioner', 'Adept', 'Expert', 'Master', 'Grandmaster', 'Champion', 'Virtuoso', 'Sage', 'Prodigy', 'Legend', 'Mythic', 'Transcendent', 'Immortal', 'Ascendant', 'Eternal']
export function levelProgress(points: number) {
  let current = Math.max(0, Math.floor(Number.isFinite(points) ? points : 0)), level = 1
  while (current >= Math.round(200 * level ** 1.5)) { current -= Math.round(200 * level ** 1.5); level++ }
  const toNext = Math.round(200 * level ** 1.5)
  return { level, current, toNext, percent: Math.floor(current / toNext * 100), title: LEVEL_TITLES[Math.min(level, 20) - 1] + (level > 20 ? ` ★${level - 19}` : '') }
}
export const dayKey = (date = new Date()) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit' }).format(date)
export function tokens(text: string, language: string) {
  const normalized = text.normalize('NFKC').toLowerCase().replace(/[‘’]/g, "'")
  if (language.startsWith('ja')) return [...normalized].filter(c => /[\p{L}\p{N}]/u.test(c))
  return normalized.match(/[\p{L}\p{N}]+(?:'[\p{L}\p{N}]+)*/gu) ?? []
}
export interface CheckResult { correct: number; total: number; extra: number; words: { text: string; correct: boolean }[]; accuracy: number }
export function checkAnswer(expected: string, answer: string, language: string): CheckResult {
  const target = tokens(expected, language), actual = tokens(answer, language)
  // Limit matrix size; a practice sentence has at most 2,000 meaningful units.
  if (target.length > 2000 || actual.length > 2000) throw new Error('这句过长，请先调整断句或缩短输入。')
  const width = actual.length + 1
  const table = new Uint16Array((target.length + 1) * width)
  for (let i = 1; i <= target.length; i++) for (let j = 1; j <= actual.length; j++) table[i * width + j] = target[i - 1] === actual[j - 1]
    ? table[(i - 1) * width + j - 1] + 1 : Math.max(table[(i - 1) * width + j], table[i * width + j - 1])
  const matched = new Set<number>()
  let i = target.length, j = actual.length
  while (i && j) {
    if (target[i - 1] === actual[j - 1]) { matched.add(--i); j-- }
    else if (table[(i - 1) * width + j] >= table[i * width + j - 1]) i--
    else j--
  }
  const correct = matched.size, extra = actual.length - correct
  return { correct, total: target.length, extra, words: target.map((text, index) => ({ text, correct: matched.has(index) })), accuracy: target.length ? Math.round(correct / Math.max(target.length, actual.length) * 100) : 0 }
}
export interface LearningSession { id: string; title: string; language: string; study_day: string; duration_seconds: number; sentence_count: number; points: number; correct_words: number; total_words: number; completed: boolean; updated_at: string }
export function learningSummary(sessions: LearningSession[], today = dayKey()) {
  const days = new Set(sessions.filter(s => s.sentence_count > 0).map(s => s.study_day))
  const cutoff = new Date(`${today}T00:00:00+08:00`); cutoff.setUTCDate(cutoff.getUTCDate() - 29)
  const recent = sessions.filter(s => s.study_day >= dayKey(cutoff) && s.study_day <= today)
  let streak = 0
  const cursor = new Date(`${today}T12:00:00+08:00`)
  if (!days.has(today)) cursor.setUTCDate(cursor.getUTCDate() - 1)
  while (days.has(dayKey(cursor))) { streak++; cursor.setUTCDate(cursor.getUTCDate() - 1) }
  return { points: sessions.reduce((n, s) => n + s.points, 0), seconds: recent.reduce((n, s) => n + s.duration_seconds, 0),
    sentences: recent.reduce((n, s) => n + s.sentence_count, 0), completed: recent.filter(s => s.completed).length, streak, days,
    accuracy: recent.reduce((n, s) => n + s.total_words, 0) ? Math.round(recent.reduce((n, s) => n + s.correct_words, 0) / recent.reduce((n, s) => n + s.total_words, 0) * 100) : null }
}
