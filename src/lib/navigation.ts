export type PageRoute = 'home' | 'en' | 'ja'

export function routeFromHash(hash: string): PageRoute {
  const match = hash.match(/^#\/practice\/(en|ja)\/?$/)
  return match ? match[1] as 'en' | 'ja' : 'home'
}
