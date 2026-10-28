import type { CSSProperties } from 'react'

const paths = {
  headphones: <><path d="M4 14v-3a8 8 0 0 1 16 0v3" /><rect x="3" y="12" width="4" height="8" rx="2" /><rect x="17" y="12" width="4" height="8" rx="2" /></>,
  play: <path d="m9 5 11 7-11 7z" />,
  pause: <><path d="M8 5v14M16 5v14" /></>,
  previous: <><path d="M6 5v14M19 5 8 12l11 7z" /></>,
  next: <><path d="M18 5v14M5 5l11 7-11 7z" /></>,
  repeat: <><path d="m17 2 4 4-4 4M21 6H8a5 5 0 0 0-5 5M7 22l-4-4 4-4M3 18h13a5 5 0 0 0 5-5" /></>,
  plus: <path d="M12 5v14M5 12h14" />,
  eye: <><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" /></>,
  hide: <><path d="m3 3 18 18M10.6 5.1A12 12 0 0 1 12 5c7 0 10 7 10 7a18 18 0 0 1-3 3.8M6.2 6.2A20 20 0 0 0 2 12s3 7 10 7a12 12 0 0 0 5.8-1.6" /><path d="M10 10a3 3 0 0 0 4 4" /></>,
  download: <><path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5" /></>,
  upload: <><path d="M12 16V3m-5 5 5-5 5 5M4 16v5h16v-5" /></>,
  check: <path d="m5 12 4 4L19 6" />,
  close: <path d="m6 6 12 12M6 18 18 6" />,
  stop: <rect x="6" y="6" width="12" height="12" rx="1" />,
  edit: <><path d="m16 3 5 5L9 20l-6 1 1-6Z" /><path d="m13 6 5 5" /></>,
  moon: <path d="M20.8 13.2A9 9 0 0 1 10.8 3.1a9 9 0 1 0 10 10.1Z" />,
  sun: <><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></>,
  arrow: <path d="M4 12h16m-6-6 6 6-6 6" />,
  playAll: <><path d="M3 5h11M3 10h8M3 15h5M14 11l7 5-7 5z" /></>,
  focus: <><path d="M8 3H3v5M16 3h5v5M3 16v5h5M21 16v5h-5" /></>,
  minimize: <><path d="M3 8h5V3M21 8h-5V3M8 21v-5H3M16 21v-5h5" /></>,
  search: <><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 5 5" /></>,
  settings: <><path d="M4 6h16M4 12h16M4 18h16" /><circle cx="8" cy="6" r="2" fill="var(--surface)" /><circle cx="16" cy="12" r="2" fill="var(--surface)" /><circle cx="10" cy="18" r="2" fill="var(--surface)" /></>,
}
export function Icon({ name, size = 18, style }: { name: keyof typeof paths; size?: number; style?: CSSProperties }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={style}>{paths[name]}</svg>
}
