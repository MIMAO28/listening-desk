import icons from './levelIcons.json' with { type: 'json' }
import names from './levelNames.json' with { type: 'json' }

export const LEVEL_ICON_COUNT = icons.length
export function levelBadge(level: number) {
  const rank = Number.isFinite(level) ? Math.max(1, Math.floor(level)) : 1
  const index = (rank - 1) % icons.length
  const cycle = Math.floor((rank - 1) / icons.length)
  return { icon: icons[index], name: names[index] + (cycle ? `·第${cycle + 1}境` : ''), rank }
}
