export interface Sentence {
  id: string
  text: string
}

export interface Material {
  id: string
  title: string
  language: string
  sourceText: string
  sentences: Sentence[]
  draftText: string
  currentIndex: number
  updatedAt: string
}

export interface Preferences {
  voiceURI: string
  rate: number
  transcriptHidden: boolean
  theme: 'light' | 'dark'
  colorTheme: string
}

export interface Workspace {
  schemaVersion: 1
  materials: Material[]
  activeId: string
  preferences: Preferences
}
