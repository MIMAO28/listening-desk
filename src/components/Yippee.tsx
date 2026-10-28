import { useEffect, useRef, useState } from 'react'
import { assetUrl } from '../lib/assetUrl.ts'
import poster from '../assets/yippee-poster.webp?inline'

type RiveInstance = {
  resizeDrawingSurfaceToCanvas(): void
  play(): void
  pause(): void
  cleanup(): void
  volume: number
}
type RiveRuntime = {
  RuntimeLoader: { setWasmUrl(url: string): void; setWasmFallbackUrl(url: string): void; setWasmBinary(value: ArrayBuffer): void }
  Rive: new (options: Record<string, unknown>) => RiveInstance
}
declare global { interface Window { rive?: RiveRuntime } }
let runtimePromise: Promise<RiveRuntime> | undefined
function loadRuntime() {
  if (window.rive) return Promise.resolve(window.rive)
  if (!runtimePromise) runtimePromise = new Promise<RiveRuntime>((resolve, reject) => {
    const script = document.createElement('script')
    const fail = () => { clearTimeout(deadline); script.remove(); runtimePromise = undefined; reject(new Error('Rive unavailable')) }
    const deadline = setTimeout(fail, 20000)
    script.src = assetUrl('vendor/rive/rive.js')
    script.async = true
    script.onload = () => { clearTimeout(deadline); if (window.rive) resolve(window.rive); else fail() }
    script.onerror = fail
    document.head.append(script)
  })
  return runtimePromise
}

const binaryRequests = new Map<string, Promise<ArrayBuffer>>()
function loadBinary(path: string) {
  const url = assetUrl(path)
  if (!binaryRequests.has(url)) {
    const controller = new AbortController()
    const deadline = setTimeout(() => controller.abort(), 20000)
    const request = fetch(url, { signal: controller.signal }).then(response => {
      if (!response.ok) throw new Error('Animation asset unavailable')
      return response.arrayBuffer()
    }).catch(error => { binaryRequests.delete(url); throw error }).finally(() => clearTimeout(deadline))
    binaryRequests.set(url, request)
  }
  return binaryRequests.get(url)!
}

// Original Yippee artwork by gianluigi.ranauro, CC BY 4.0.
// Preserve the original face/motion; a shared SVG color map adapts canvas/poster to the theme.
export function Yippee({ paused = false }: { paused?: boolean }) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'fallback'>('loading')
  const [poked, setPoked] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const pausedRef = useRef(paused)
  pausedRef.current = paused

  useEffect(() => {
    let disposed = false
    let loaded = false
    let frameScheduled = false
    let paintFrame = 0
    let revealFrame = 0
    let visible = true
    let animation: RiveInstance | null = null
    const fallback = () => { if (!disposed) setStatus('fallback') }
    const deadline = setTimeout(fallback, 20000)
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    const sync = () => {
      if (!animation || !loaded) return
      if (pausedRef.current || media.matches || document.hidden || !visible) animation.pause()
      else animation.play()
      canvas.current?.setAttribute('data-playing', String(!pausedRef.current && !media.matches && !document.hidden && visible))
    }
    const observer = new IntersectionObserver(entries => { visible = entries[0]?.isIntersecting ?? true; sync() })
    if (canvas.current) observer.observe(canvas.current)
    const resize = new ResizeObserver(() => animation?.resizeDrawingSurfaceToCanvas())
    if (canvas.current) resize.observe(canvas.current)
    document.addEventListener('visibilitychange', sync)
    media.addEventListener('change', sync)
    const pauseEvent = () => sync()
    canvas.current?.addEventListener('sync-playback', pauseEvent)
    const target = canvas.current
    const resources = typeof WebAssembly === 'undefined' ? Promise.reject(new Error('WebAssembly unavailable'))
      : Promise.all([loadRuntime(), loadBinary('characters/yippee/yippee.riv'), loadBinary('vendor/rive/rive.wasm')])
    resources.then(([runtime, buffer, wasm]) => {
      if (disposed || !target) return
      runtime.RuntimeLoader.setWasmUrl(assetUrl('vendor/rive/rive.wasm'))
      runtime.RuntimeLoader.setWasmFallbackUrl(assetUrl('vendor/rive/rive_fallback.wasm'))
      runtime.RuntimeLoader.setWasmBinary(wasm)
      animation = new runtime.Rive({
        canvas: target, buffer, stateMachine: 'State Machine 1',
        autoBind: true, autoplay: true, shouldDisableRiveListeners: true,
        enableRiveAssetCDN: false,
        onLoad: () => {
          if (disposed || !animation) return
          loaded = true
          animation.volume = 0
          animation.resizeDrawingSurfaceToCanvas()
          sync()
        },
        onAdvance: () => {
          if (disposed || !loaded || frameScheduled) return
          frameScheduled = true
          paintFrame = requestAnimationFrame(() => {
            revealFrame = requestAnimationFrame(() => {
              if (!disposed) { clearTimeout(deadline); setStatus('ready') }
            })
          })
        },
        onLoadError: () => { clearTimeout(deadline); fallback() },
      })
    }).catch(() => { clearTimeout(deadline); fallback() })
    return () => {
      disposed = true
      observer.disconnect(); resize.disconnect()
      document.removeEventListener('visibilitychange', sync)
      media.removeEventListener('change', sync)
      target?.removeEventListener('sync-playback', pauseEvent)
      animation?.cleanup()
      clearTimeout(deadline)
      cancelAnimationFrame(paintFrame); cancelAnimationFrame(revealFrame)
      clearTimeout(timer.current)
    }
  }, [])
  useEffect(() => { canvas.current?.dispatchEvent(new Event('sync-playback')) }, [paused])

  const interact = () => {
    if (paused || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    clearTimeout(timer.current)
    setPoked(true)
    timer.current = setTimeout(() => setPoked(false), 650)
  }
  return <button className={`yippee-character${poked && !paused ? ' is-poked' : ''}${paused ? ' is-paused' : ''}`}
    type="button" aria-label="和 Yippee 互动" aria-disabled={paused} onClick={interact}
    title="Yippee · 悬停或点击互动" data-status={status}>
    <canvas ref={canvas} aria-hidden="true" />
    <img className="yippee-poster" src={poster} width="480" height="480" alt="" aria-hidden="true" decoding="sync" fetchPriority="high" />
  </button>
}
