export type PageRoute = 'home' | 'en' | 'ja' | 'dashboard'

export function routeFromHash(hash: string): PageRoute {
  if (/^#\/dashboard\/?$/.test(hash)) return 'dashboard'
  const match = hash.match(/^#\/practice\/(en|ja)\/?$/)
  return match ? match[1] as 'en' | 'ja' : 'home'
}
