import { readFile, writeFile } from 'node:fs/promises'

// Read only factual color values from official palette pages, not site code/assets.
const palettes = []
for (let id = 1; id <= 17; id++) {
  const html = await readFile(new URL(`../output/happy-hues/${id}.html`, import.meta.url), 'utf8')
  const colors = [...html.matchAll(/class="hue-title"[^>]*>([^<]+)<\/div>[\s\S]*?class="hue-hex"[^>]*>(#[a-fA-F0-9]{6})<\/div>/g)]
    .map(match => ({ role: match[1].trim().toLowerCase(), hex: match[2].toLowerCase() }))
  const first = role => colors.find(color => color.role === role)?.hex
  const swatchBlock = html.match(new RegExp(`href="/palettes/${id}"[\\s\\S]*?<div class="palette-inner-wrap">([\\s\\S]*?)</a>`))?.[1] ?? ''
  const swatches = [...swatchBlock.matchAll(/background-color:(#[a-fA-F0-9]{6})/g)].map(match => match[1].toLowerCase()).slice(0, 5)
  if (!first('background') || !first('headline') || !first('button') || swatches.length !== 5) throw new Error(`Incomplete palette ${id}`)
  palettes.push({ id: `hues-${id}`, number: id, sourceUrl: `https://www.happyhues.co/palettes/${id}`,
    background: first('background'), headline: first('headline'), paragraph: first('paragraph') ?? first('sub headline'),
    button: first('button'), buttonText: first('button text'),
    illustration: { stroke: first('stroke'), main: first('main'), highlight: first('highlight'), secondary: first('secondary'), tertiary: first('tertiary') },
    swatches, colors })
}
await writeFile(new URL('../src/lib/happyHues.json', import.meta.url), JSON.stringify(palettes, null, 2) + '\n')
console.log(JSON.stringify(palettes.map(({ number, background, button, swatches }) => ({ number, background, button, swatches }))))
