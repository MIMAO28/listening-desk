import sourcePalettes from './happyHues.json' with { type: 'json' }

export type ThemeMode = 'light' | 'dark'
const names = ['薄荷汽水', '青柠海岸', '晴空蓝', '鸢尾夜色', '森林与杏', '明净紫', '樱雾', '青瓷', '橘与石墨', '松林琥珀', '燕麦咖啡', '暮蓝玫瑰', '午夜橙', '柠檬浅湾', '蜜桃花园', '可可莓果', '奶油海风']
export const COLOR_THEMES = sourcePalettes.map((palette, i) => ({ ...palette, name: names[i] }))
export const DEFAULT_COLOR_THEME = 'hues-17'
export const getColorTheme = (id: string) => COLOR_THEMES.find(theme => theme.id === id) ?? COLOR_THEMES[16]
const rgb = (hex: string) => [1, 3, 5].map(index => parseInt(hex.slice(index, index + 2), 16))
export function mix(a: string, b: string, weight: number): string {
  const first = rgb(a), second = rgb(b)
  return '#' + first.map((value, index) => Math.round(value * (1 - weight) + second[index] * weight).toString(16).padStart(2, '0')).join('')
}
export function luminance(hex: string): number {
  const [r, g, b] = rgb(hex).map(value => { const c = value / 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4 })
  return .2126 * r + .7152 * g + .0722 * b
}
export function contrast(a: string, b: string): number {
  const [bright, dark] = [luminance(a), luminance(b)].sort((a, b) => b - a)
  return (bright + .05) / (dark + .05)
}
const readable = (candidate: string, surfaces: string[], ratio: number) => {
  const options = [candidate, '#000000', '#ffffff']
  const target = options.reduce((best, color) => Math.min(...surfaces.map(bg => contrast(color, bg))) > Math.min(...surfaces.map(bg => contrast(best, bg))) ? color : best)
  for (let step = 0; step <= 100; step++) {
    const color = mix(candidate, target, step / 100)
    if (surfaces.every(bg => contrast(color, bg) >= ratio)) return color
  }
  return target
}

/** Original colors remain in the catalogue; derived UI colors keep text legible. */
export function themeTokens(id: string, mode: ThemeMode): Record<string, string> {
  const theme = getColorTheme(id)
  const dark = mode === 'dark'
  const sourceDark = luminance(theme.background) < .22
  const bg = sourceDark === dark ? theme.background : dark ? mix(theme.headline, '#101218', .82) : mix(theme.background, '#ffffff', .95)
  const surface = mix(bg, dark ? '#ffffff' : '#ffffff', dark ? .045 : .42)
  const soft = mix(surface, dark ? '#ffffff' : theme.headline, dark ? .035 : .035)
  const accent = theme.button
  const active = mix(surface, accent, dark ? .19 : .12)
  const surfaces = [bg, surface, soft, active]
  const ink = readable(dark ? '#f4f2f5' : sourceDark ? '#252530' : theme.headline, surfaces, 7)
  const muted = readable(mix(ink, bg, .32), surfaces, 4.5)
  const buttonInk = readable(theme.buttonText ?? ink, [accent], 4.5)
  const link = readable(accent, surfaces, 4.5)
  const focus = readable(accent, [...surfaces, active], 3)
  const mascot = luminance(accent) < .06 ? theme.swatches.find(color => {
    const channels = rgb(color)
    return Math.max(...channels) - Math.min(...channels) > 40 && luminance(color) > .15 && luminance(color) < .85
  }) ?? accent : accent
  const paper = mix('#ffffff', theme.swatches[2], .05)
  const mascotInk = readable('#232338', [paper], 7)
  const mascotMid = readable(mix(mascot, '#151725', .5), [paper], 4.5)
  return {
    '--bg': bg, '--header-bg': bg, '--surface': surface, '--surface-soft': soft,
    '--ink': ink, '--muted': muted, '--quiet': muted, '--accent': accent,
    '--accent-hover': mix(accent, buttonInk, .1), '--accent-soft': active,
    '--accent-line': mix(accent, surface, .45), '--link': link, '--teal': link,
    '--line': mix(surface, ink, dark ? .2 : .16), '--line-soft': mix(surface, ink, .09),
    '--control-line': readable(mix(surface, ink, .4), surfaces, 3), '--button-ink': buttonInk,
    '--focus': focus, '--success': readable(dark ? '#8fceb1' : '#35775b', surfaces, 4.5),
    '--warning-bg': dark ? '#312b20' : '#fff5df', '--warning-ink': dark ? '#f5d8a0' : '#684716', '--warning-line': dark ? '#86734b' : '#b69b5a',
    '--error-bg': dark ? '#382a2c' : '#fff0ed', '--error-ink': dark ? '#f5c1b9' : '#92372d', '--error-line': dark ? '#956c72' : '#c28a82',
    '--toast-bg': ink, '--toast-ink': bg, '--backdrop': '#0e101966', '--shadow-color': dark ? '#00000040' : '#20203016',
    '--mascot-ink': mascotInk, '--mascot-mid': mascotMid, '--mascot-accent': mascot,
    '--mascot-paper': paper, '--mascot-bg': mix(mascot, paper, .28),
    '--secondary': theme.illustration.secondary ?? theme.swatches[1], '--tertiary': theme.illustration.tertiary ?? theme.swatches[2],
  }
}

export function characterChannels(tokens: Record<string, string>) {
  const colors = ['--mascot-ink', '--mascot-mid', '--mascot-accent', '--mascot-paper'].map(key => rgb(tokens[key]))
  return [0, 1, 2].map(channel => colors.map(color => (color[channel] / 255).toFixed(5)).join(' '))
}
