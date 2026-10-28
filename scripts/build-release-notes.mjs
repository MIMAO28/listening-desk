import { readFile, writeFile, mkdir } from 'node:fs/promises'
const releases = JSON.parse(await readFile(new URL('../docs/releases.json', import.meta.url), 'utf8'))
const repo = 'https://github.com/MIMAO28/listening-desk'
const heading = '# 更新日志\n\n记录GitHub Pages网站的版本变更。v0.1.0–v0.5.1共9个历史部署的中文说明与标签于2026-10-28补录，原提交历史未改写；之后的版本随发布记录。\n\n历史标签保存可部署的静态文件；当前React/TypeScript开发源码另见 [source分支](' + repo + '/tree/source)。早于首次GitHub Pages发布的界面迭代，没有单独的GitHub快照；早期源码未追溯补造。\n\n网址里的 ?v=9 等参数用于刷新缓存，不是固定历史版本地址；请用下面的标签和Release查看历史。\n\n'
const sections = releases.toReversed().map(release => `## ${release.tag} · ${release.title}\n\n${release.date} · [更新说明](${repo}/releases/tag/${release.tag}) · [原提交 ${release.commit.slice(0, 7)}](${repo}/commit/${release.commit})\n\n${release.changes.map(change => `- ${change}`).join('\n')}\n`)
await writeFile(new URL('../CHANGELOG.md', import.meta.url), heading + sections.join('\n'))
await mkdir(new URL('../output/github-releases/', import.meta.url), { recursive: true })
for (const release of releases) {
  const sourceTag = release.sourceTag ?? (release.tag === 'v0.5.1' ? 'source-v0.5.1' : null)
  const notes = `${release.date}${release.sourceTag ? '' : '（中文说明与标签为后补，未改写历史）'}\n\n${release.changes.map(change => `- ${change}`).join('\n')}\n\n[对应静态发布提交](${repo}/commit/${release.commit})\n\n${sourceTag ? `[固定开发源码 ${sourceTag}](${repo}/tree/${sourceTag})` : '该早期版本没有单独保留React开发源码快照；请勿把最新源码当成此版本源码。'}\n\n${release.validation ?? ''}\n`
  await writeFile(new URL(`../output/github-releases/${release.tag}.md`, import.meta.url), notes)
}
console.log(`Prepared ${releases.length} Chinese release notes and CHANGELOG.md`)
