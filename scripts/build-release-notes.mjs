import { readFile, writeFile, mkdir } from 'node:fs/promises'
const releases = JSON.parse(await readFile(new URL('../docs/releases.json', import.meta.url), 'utf8'))
const repo = 'https://github.com/MIMAO28/listening-desk'
const heading = '# 更新日志\n\n这里记录迁到 GitHub Pages 后的9次网站部署。日期按原提交日期列出，中文说明与版本标签于2026-10-28补录；原提交历史未改写。\n\n历史标签保存可部署的静态文件；当前React/TypeScript开发源码另见 [source分支](' + repo + '/tree/source)。早于首次GitHub Pages发布的界面迭代，没有单独的GitHub快照；早期源码未追溯补造。\n\n网址里的 ?v=8 等参数用于刷新缓存，不是固定历史版本地址；请用下面的标签和Release查看历史。\n\n'
const sections = releases.toReversed().map(release => `## ${release.tag} · ${release.title}\n\n${release.date} · [更新说明](${repo}/releases/tag/${release.tag}) · [原提交 ${release.commit.slice(0, 7)}](${repo}/commit/${release.commit})\n\n${release.changes.map(change => `- ${change}`).join('\n')}\n`)
await writeFile(new URL('../CHANGELOG.md', import.meta.url), heading + sections.join('\n'))
await mkdir(new URL('../output/github-releases/', import.meta.url), { recursive: true })
for (const release of releases) {
  const latest = release.tag === 'v0.5.1'
  const notes = `原网站提交日期：${release.date}（中文说明与标签为后补，未改写历史）。\n\n${release.changes.map(change => `- ${change}`).join('\n')}\n\n[对应静态发布提交](${repo}/commit/${release.commit})\n\n版本归档是可部署的静态网站文件。${latest ? `本版开发源码已单独备份：[固定源码快照 source-v0.5.1](${repo}/tree/source-v0.5.1)。\n\n验证：62项逻辑测试、17套×日夜主题检查及播放/查词回归通过。` : '该早期版本没有单独保留React开发源码快照；请勿把最新源码当成此版本源码。'}\n`
  await writeFile(new URL(`../output/github-releases/${release.tag}.md`, import.meta.url), notes)
}
console.log(`Prepared ${releases.length} Chinese release notes and CHANGELOG.md`)
