import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'

const root = fileURLToPath(new URL('../', import.meta.url))
const url = 'http://127.0.0.1:5173/'
const noOpen = process.argv.includes('--no-open')

async function probe() {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(1200) })
    const body = await response.text()
    return response.ok && body.includes('<title>听写练习台</title>') ? 'ours' : 'other'
  } catch { return 'unavailable' }
}
function openBrowser() {
  if (noOpen) return
  const browser = spawn('powershell.exe', ['-NoProfile', '-Command', `Start-Process '${url}'`],
    { windowsHide: true, stdio: 'ignore' })
  browser.on('error', () => console.log(`请手动打开 ${url}`))
  browser.on('exit', code => { if (code) console.log(`浏览器未能自动打开，请手动打开 ${url}`) })
}

if (await probe() === 'ours') {
  console.log(`听写练习台已经运行：${url}`)
  openBrowser()
} else if (!existsSync(resolve(root, 'node_modules/vite/bin/vite.js'))) {
  console.error('未找到项目依赖。请先在项目目录运行 npm.cmd install，再重新启动。')
  process.exitCode = 1
} else {
  console.log('正在启动听写练习台。请保留这个窗口；关闭窗口会停止本次服务。')
  const child = spawn(process.execPath, [resolve(root, 'node_modules/vite/bin/vite.js'),
    '--host', '127.0.0.1', '--port', '5173', '--strictPort'], { cwd: root, stdio: 'inherit' })
  child.on('error', error => { console.error(`启动失败：${error.message}`); process.exitCode = 1 })
  child.on('exit', code => { process.exitCode = code ?? 1 })
  let stopped = false
  process.on('SIGINT', () => { stopped = true; child.kill(); process.exitCode = 0 })
  let ready = false
  for (let i = 0; i < 40 && !stopped && child.exitCode === null; i++) {
    await new Promise(resolve => setTimeout(resolve, 250))
    const state = await probe()
    if (state === 'ours') { ready = true; break }
    if (state === 'other') { console.error('5173 端口正由其他程序使用，请关闭该程序后重试。'); break }
  }
  if (ready) { console.log(`练习页面：${url}`); openBrowser() }
  else if (!stopped) { console.error('服务未能就绪，请查看上方错误信息。'); child.kill(); process.exitCode = 1 }
}
