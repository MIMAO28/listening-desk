// Vite sets BASE_URL for each host; Node's unit-test runner has no Vite env.
export function assetUrl(path: string) {
  return `${import.meta.env?.BASE_URL ?? '/'}${path.replace(/^\/+/, '')}`
}
