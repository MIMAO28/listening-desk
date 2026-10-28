import { test } from 'node:test'
import assert from 'node:assert/strict'
import { COLOR_THEMES, DEFAULT_COLOR_THEME, getColorTheme, themeTokens, contrast, characterChannels } from './colorThemes.ts'

test('all 17 official palettes retain source IDs, original color roles and swatches', () => {
  assert.equal(COLOR_THEMES.length, 17)
  assert.equal(new Set(COLOR_THEMES.map(p => p.id)).size, 17)
  for (const palette of COLOR_THEMES) {
    assert.equal(palette.sourceUrl, `https://www.happyhues.co/palettes/${palette.number}`)
    assert.equal(palette.swatches.length, 5)
    assert.ok(palette.swatches.every(color => /^#[a-f0-9]{6}$/.test(color)))
    assert.ok(palette.colors.some(color => color.role === 'button' && color.hex === palette.button))
  }
  assert.equal(getColorTheme('unknown').id, DEFAULT_COLOR_THEME)
})
test('all 34 theme/mode pairs keep readable text, highlighted text and buttons', () => {
  for (const palette of COLOR_THEMES) for (const mode of ['light', 'dark'] as const) {
    const t = themeTokens(palette.id, mode)
    for (const background of ['--bg', '--surface', '--surface-soft', '--accent-soft']) {
      for (const foreground of ['--ink', '--muted', '--link']) assert.ok(contrast(t[foreground], t[background]) >= 4.5, `${palette.id} ${mode} ${foreground}/${background}`)
      assert.ok(contrast(t['--focus'], t[background]) >= 3)
    }
    assert.ok(contrast(t['--button-ink'], t['--accent']) >= 4.5, `${palette.id} ${mode} button`)
    assert.ok(contrast(t['--ink'], t['--bg']) >= 7)
  }
})
test('day/night adapts surfaces while preserving palette selection and button identity', () => {
  for (const palette of COLOR_THEMES) {
    const day = themeTokens(palette.id, 'light'), night = themeTokens(palette.id, 'dark')
    assert.notEqual(day['--bg'], night['--bg'])
    assert.equal(day['--accent'], palette.button)
    assert.equal(night['--accent'], palette.button)
    const channels = characterChannels(day)
    assert.equal(channels.length, 3)
    assert.ok(channels.every(channel => channel.split(' ').length === 4))
  }
  assert.equal(themeTokens('hues-17', 'light')['--mascot-accent'], '#f582ae', 'Default character follows the pink accent rather than fading into a cream background')
})
