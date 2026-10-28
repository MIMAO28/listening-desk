import { useEffect, useRef, useState } from 'react'
import type { CSSProperties, PointerEvent } from 'react'

// SVG adaptation of Pumpkin Button by endraandoyo (CC BY 4.0).
// The homepage provides the original link, author, license and modification credits.
export function Pumpkin({ kind, interactive = false, paused = false, className = '' }: {
  kind: 'rose' | 'lavender'; interactive?: boolean; paused?: boolean; className?: string
}) {
  const [hovered, setHovered] = useState(false)
  const [poked, setPoked] = useState(false)
  const [eyes, setEyes] = useState({ x: 0, y: 0 })
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  useEffect(() => () => clearTimeout(timer.current), [])
  const move = (event: PointerEvent<HTMLButtonElement>) => {
    if (paused || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const bounds = event.currentTarget.getBoundingClientRect()
    setEyes({ x: Math.max(-5, Math.min(5, (event.clientX - bounds.left - bounds.width / 2) / bounds.width * 12)),
      y: Math.max(-4, Math.min(4, (event.clientY - bounds.top - bounds.height / 2) / bounds.height * 10)) })
  }
  const reset = () => { setHovered(false); setEyes({ x: 0, y: 0 }) }
  const poke = () => {
    if (paused) return
    clearTimeout(timer.current); setPoked(true)
    timer.current = setTimeout(() => setPoked(false), 900)
  }
  const classes = `pumpkin-character pumpkin-${kind}${!paused && hovered ? ' is-hovered' : ''}${!paused && poked ? ' is-poked' : ''} ${className}`
  const art = <svg className="pumpkin-art" viewBox="0 0 320 290" fill="none" aria-hidden="true">
    <ellipse className="pumpkin-shadow" cx="160" cy="264" rx="95" ry="13" fill="var(--pumpkin-shadow)" />
    <g className="pumpkin-idle"><g className="pumpkin-body" stroke="var(--pumpkin-outline)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
      <g className="pumpkin-stem"><path d={kind === 'rose' ? 'M146 91 137 45q10-12 25-5l8 50Z' : 'm149 90 8-49q17-11 28 1l-17 50Z'} fill="var(--pumpkin-leaf)" />
        <path d={kind === 'rose' ? 'm145 48 10 29' : 'm172 47-9 31'} opacity=".45" /></g>
      <path className="pumpkin-leaf" d="M171 73c13-27 39-25 48-10-13 22-33 27-48 10Z" fill="var(--pumpkin-leaf)" />
      <path d="M160 87C111 62 61 91 48 140c-18 63 14 105 66 106 28 13 65 13 92 0 52-1 84-43 66-106-14-49-63-78-112-53Z" fill="var(--pumpkin-side)" />
      <ellipse cx="133" cy="166" rx="61" ry="87" fill="var(--pumpkin-main)" />
      <ellipse cx="189" cy="166" rx="61" ry="87" fill="var(--pumpkin-main)" />
      <ellipse cx="160" cy="166" rx="42" ry="87" fill="var(--pumpkin-center)" />
      <path d="M104 115q-17 12-21 34" stroke="var(--pumpkin-highlight)" strokeWidth="11" />
      <circle cx="80" cy="166" r="6" fill="var(--pumpkin-highlight)" stroke="none" />
      <g className="pumpkin-face" style={{ '--eye-x': `${eyes.x}px`, '--eye-y': `${eyes.y}px` } as CSSProperties}>
        <g className="pumpkin-eyes"><circle cx="124" cy="164" r="14" fill="var(--pumpkin-outline)" /><circle cx="196" cy="164" r="14" fill="var(--pumpkin-outline)" />
          <g className="pumpkin-eye-lights" fill="#fff9fb" stroke="none"><circle cx="128" cy="160" r="4" /><circle cx="200" cy="160" r="4" /></g></g>
        <path d="m157 174-5 10h14l-5-10Z" fill="var(--pumpkin-outline)" strokeWidth="2" />
        <path className="pumpkin-mouth-rest" d="M137 200q23 14 46 0" strokeWidth="5" />
        <g className="pumpkin-mouth-happy"><path d="M134 196q26 10 52 0c-4 30-46 30-52 0Z" fill="var(--pumpkin-outline)" />
          <path d="m146 201 3 8h8l-1-7m10 0-1 7h8l3-8" fill="#fff9fb" stroke="none" /></g>
        <ellipse cx="99" cy="188" rx="12" ry="5" fill="var(--pumpkin-cheek)" stroke="none" /><ellipse cx="221" cy="188" rx="12" ry="5" fill="var(--pumpkin-cheek)" stroke="none" />
      </g>
    </g></g>
    <g className="pumpkin-sparkles" stroke="var(--pumpkin-outline)" strokeWidth="2.5" fill="var(--pumpkin-highlight)">
      <path d="m268 77 3 10 11 4-11 4-3 11-4-11-10-4 10-4Z" /><path d="m45 96 2 7 8 3-8 2-2 8-3-8-7-2 7-3Z" />
    </g>
  </svg>
  if (!interactive) return <span className={classes} aria-hidden="true">{art}</span>
  return <button className={classes} type="button" aria-label="和南瓜互动" aria-disabled={paused}
    title={paused ? '动画已暂停' : '悬停或点击，让南瓜回应你'} onPointerMove={move}
    onPointerEnter={() => !paused && setHovered(true)} onPointerLeave={reset}
    onFocus={() => !paused && setHovered(true)} onBlur={reset} onClick={poke}>{art}</button>
}
