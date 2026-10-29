import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { LEVEL_ICON_COUNT, levelBadge } from './levelBadges.ts'
import excluded from './excludedLevelIcons.json' with { type: 'json' }

test('all levels have unique Chinese names and distinct retained icons before cycling', () => {
  const badges = Array.from({ length: LEVEL_ICON_COUNT }, (_, i) => levelBadge(i + 1))
  assert.equal(LEVEL_ICON_COUNT, 4105)
  assert.equal(new Set(badges.map(b => b.name)).size, LEVEL_ICON_COUNT)
  assert.equal(new Set(badges.map(b => b.icon)).size, LEVEL_ICON_COUNT)
  for (const badge of badges) {
    assert.match(badge.name, /^[\p{Script=Han}·]+$/u)
    assert.ok(!excluded.includes(badge.icon))
  }
  assert.equal(levelBadge(4106).icon, levelBadge(1).icon)
  assert.notEqual(levelBadge(4106).name, levelBadge(1).name)
})

test('visual complexity never decreases through the complete ordered catalog', () => {
  const rows = JSON.parse(readFileSync(new URL('../../public/icons/levels/ORDER.json', import.meta.url), 'utf8'))
  assert.equal(rows.length, LEVEL_ICON_COUNT)
  for (let i = 0; i < rows.length; i++) {
    assert.equal(rows[i].id, levelBadge(i + 1).icon)
    assert.equal(rows[i].name, levelBadge(i + 1).name)
    if (i) assert.ok(rows[i].complexity >= rows[i - 1].complexity)
  }
  assert.ok(rows.at(-1).complexity > rows[0].complexity * 8)
})
