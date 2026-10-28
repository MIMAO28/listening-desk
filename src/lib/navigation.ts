export type PageRoute = 'home' | 'en' | 'ja' | 'dashboard' | 'confirm'

export function routeFromHash(hash: string): PageRoute {
  if (/^#\/auth\/confirm(?:\?|$)/.test(hash)) return 'confirm'
  if (/^#\/dashboard\/?$/.test(hash)) return 'dashboard'
  const match = hash.match(/^#\/practice\/(en|ja)\/?$/)
  return match ? match[1] as 'en' | 'ja' : 'home'
}
