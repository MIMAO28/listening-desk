export interface VoiceLike {
  name: string
  lang: string
  voiceURI?: string
  localService?: boolean
}

// These are listening-guide nicknames, not claims about a real speaker's age.
const knownVoices: Record<string, { language: string; nickname: string; name: string }> = {
  mark: { language: 'en', nickname: '清朗青年音', name: 'Mark' },
  david: { language: 'en', nickname: '沉稳大叔音', name: 'David' },
  zira: { language: 'en', nickname: '清晰女声', name: 'Zira' },
  haruka: { language: 'ja', nickname: '温和叙述音', name: 'Haruka' },
  ichiro: { language: 'ja', nickname: '沉稳叙述音', name: 'Ichiro' },
  ayumi: { language: 'ja', nickname: '轻柔朗读音', name: 'Ayumi' },
  sayaka: { language: 'ja', nickname: '明亮朗读音', name: 'Sayaka' },
  aria: { language: 'en', nickname: '清亮知性女声', name: 'Aria' },
  jenny: { language: 'en', nickname: '温柔青年女声', name: 'Jenny' },
  guy: { language: 'en', nickname: '醇厚沉稳男声', name: 'Guy' },
  ryan: { language: 'en', nickname: '清朗英伦男声', name: 'Ryan' },
  sonia: { language: 'en', nickname: '柔和英伦女声', name: 'Sonia' },
  libby: { language: 'en', nickname: '明亮英伦女声', name: 'Libby' },
  natasha: { language: 'en', nickname: '轻快澳洲女声', name: 'Natasha' },
  william: { language: 'en', nickname: '温暖澳洲男声', name: 'William' },
  andrew: { language: 'en', nickname: '温暖叙述男声', name: 'Andrew' },
  brian: { language: 'en', nickname: '厚实沉稳男声', name: 'Brian' },
  ava: { language: 'en', nickname: '明亮亲切女声', name: 'Ava' },
  emma: { language: 'en', nickname: '温柔清晰女声', name: 'Emma' },
  ana: { language: 'en', nickname: '活泼轻快女声', name: 'Ana' },
  christopher: { language: 'en', nickname: '低沉叙述男声', name: 'Christopher' },
  eric: { language: 'en', nickname: '清晰稳重男声', name: 'Eric' },
  michelle: { language: 'en', nickname: '柔和亲切女声', name: 'Michelle' },
  roger: { language: 'en', nickname: '舒缓成熟男声', name: 'Roger' },
  steffan: { language: 'en', nickname: '磁性低音男声', name: 'Steffan' },
  davis: { language: 'en', nickname: '沉稳故事男声', name: 'Davis' },
  tony: { language: 'en', nickname: '爽朗青年男声', name: 'Tony' },
  jane: { language: 'en', nickname: '明亮自然女声', name: 'Jane' },
  jason: { language: 'en', nickname: '清朗自然男声', name: 'Jason' },
  nancy: { language: 'en', nickname: '清晰知性女声', name: 'Nancy' },
  sara: { language: 'en', nickname: '柔和叙述女声', name: 'Sara' },
  neerja: { language: 'en', nickname: '轻柔印度女声', name: 'Neerja' },
  prabhat: { language: 'en', nickname: '沉稳印度男声', name: 'Prabhat' },
  nanami: { language: 'ja', nickname: '温柔清亮女声', name: 'Nanami' },
  keita: { language: 'ja', nickname: '清朗青年男声', name: 'Keita' },
}

function languageCode(voice: VoiceLike) {
  return voice.lang.toLowerCase().replaceAll('_', '-')
}

function knownVoice(voice: VoiceLike) {
  // Match Microsoft's complete voice token, not names such as Markus or Markdown.
  // A voice from another provider keeps its own name even if its first name matches.
  const name = voice.name.trim()
  const microsoft = /^Microsoft\s+([A-Za-z]+?)(?:Multilingual)?(?:\s+(?:Desktop|Online(?:\s*\(Natural\))?))?(?:\s*-\s*.+)?$/i.exec(name)
  const shortName = /^(en|ja)-[A-Za-z]{2,8}-([A-Za-z]+?)(?:Multilingual)?Neural$/i.exec(name)
  const token = microsoft?.[1] ?? shortName?.[2]
  const entry = token ? knownVoices[token.toLowerCase()] : undefined
  const language = languageCode(voice).split('-')[0]
  if (shortName && shortName[1].toLowerCase() !== language) return undefined
  return entry?.language === language ? entry : undefined
}

function googleNickname(voice: VoiceLike): string | undefined {
  const name = voice.name.trim()
  const language = languageCode(voice).split('-')[0]
  if (language === 'en') {
    if (/^Google US English$/i.test(name)) return '清晰美式朗读'
    if (/^Google UK English Female$/i.test(name)) return '柔和英伦女声'
    if (/^Google UK English Male$/i.test(name)) return '沉稳英伦男声'
  }
  if (language === 'ja' && /^Google (?:日本語|Japanese)$/i.test(name)) return '清晰日语朗读'
  return undefined
}

function isOnline(voice: VoiceLike) {
  return voice.localService === false || /\bOnline\b|Neural$|^Google\b/i.test(voice.name)
}

function onlineNickname(voice: VoiceLike) {
  const locale = languageCode(voice)
  const accents: Record<string, string> = {
    'en-us': '美式英语', 'en-gb': '英式英语', 'en-au': '澳洲英语', 'en-ca': '加拿大英语',
    'en-in': '印度英语', 'en-ie': '爱尔兰英语', 'en-nz': '新西兰英语', 'en-za': '南非英语',
  }
  const language = accents[locale] ?? (locale.startsWith('en') ? '英语' : locale.startsWith('ja') ? '日语' : '')
  return `${language}在线朗读`
}

/** Human-friendly option text; the provider's identifier remains untouched. */
export function voiceLabel(voice: VoiceLike): string {
  const entry = knownVoice(voice)
  if (entry) return `${entry.nickname}（${entry.name}）`
  const google = googleNickname(voice)
  if (google) return `${google}（Google）`
  if (isOnline(voice)) return `${onlineNickname(voice)}（${voice.name || '未命名声音'}）`
  return voice.name || '未命名声音'
}

export function voiceShortName(voice: VoiceLike): string {
  return knownVoice(voice)?.nickname ?? googleNickname(voice)
    ?? (isOnline(voice) ? onlineNickname(voice) : voice.name || '未命名声音')
}

/** Suitable for a title or help text so the original voice can always be checked. */
export function voiceDescription(voice: VoiceLike): string {
  const nickname = knownVoice(voice) || googleNickname(voice) || isOnline(voice) ? '音色昵称供试听参考。' : ''
  return `${nickname}原始声音：${voice.name || '未命名声音'}；语言：${voice.lang || '未指定'}。`
}
