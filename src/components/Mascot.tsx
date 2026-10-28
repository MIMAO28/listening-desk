export function Mascot({ kind, className = '' }: { kind: 'tape' | 'rice'; className?: string }) {
  return <svg className={`mascot mascot-${kind} ${className}`} viewBox="0 0 280 280" fill="none" aria-hidden="true">
    {kind === 'tape' ? <>
      <ellipse cx="139" cy="254" rx="75" ry="9" fill="#eee9f5" className="mascot-shadow" />
      <g className="mascot-body" stroke="#635b85" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <path d="M107 205 91 238l-22 4c-9 3-10 12 2 13l35-1 22-45M168 206l16 27 23-3c12-1 20 11 6 14l-35 8-29-40" fill="#fffefa" />
        <path d="m65 121-22 10-15-11m14 11-7 14m9-14-2-15" className="mascot-hand-left" />
        <path d="m211 127 24-10 13-14m-13 14 17 4m-17-4 2-17" className="mascot-hand-right" />
        <rect x="57" y="76" width="164" height="138" rx="28" fill="#f89ed9" />
        <rect x="72" y="91" width="134" height="76" rx="17" fill="#fff9db" />
        <circle cx="105" cy="127" r="21" fill="#fffefa" /><circle cx="174" cy="127" r="21" fill="#fffefa" />
        <g className="mascot-eyes" fill="#635b85"><ellipse cx="110" cy="128" rx="10" ry="14" /><ellipse cx="169" cy="128" rx="10" ry="14" /></g>
        <path d="M123 156q16 15 33 0" fill="#fffefa" /><path d="m130 158 2 5m11-4v8" />
        <path d="m87 191 10-15h83l12 15z" fill="#ffe8f7" /><path d="M109 184h61" />
        <path d="M53 114V93c0-45 36-67 86-67s87 22 87 67v21" strokeWidth="12" />
        <path d="M53 113V94c0-42 36-66 86-66s87 24 87 66v19" stroke="#d8cef1" strokeWidth="5" />
        <rect x="43" y="105" width="20" height="46" rx="9" fill="#fffefa" /><rect x="216" y="105" width="20" height="46" rx="9" fill="#fffefa" />
        <path d="m235 58 9-2 6-13 4 12 13 5-12 6-3 13-7-12-12-2z" fill="#fff4a8" strokeWidth="2" />
      </g>
    </> : <>
      <ellipse cx="141" cy="254" rx="75" ry="9" fill="#eee9f5" className="mascot-shadow" />
      <g className="mascot-body" stroke="#635b85" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <path d="m115 208-11 28-18 6c-12 5-7 14 4 13l28-4 16-38M159 209l10 30 23 6c12 4 10 13-2 11l-33-3-17-39" fill="#fffefa" />
        <path d="m64 147-20-10-6-15m7 16-17-2m17 2-9 10" className="mascot-hand-left" />
        <path d="m215 144 20-16 8-15m-8 15 16-1m-16 1 5 11" className="mascot-hand-right" />
        <path d="M111 60c14-20 43-20 58 0l60 103c15 27 1 51-29 51H81c-31 0-44-24-29-51z" fill="#fffbe7" />
        <path d="M107 195c0-13 12-24 33-24s32 11 32 24v19h-65z" fill="#a9bdda" />
        <g className="mascot-eyes" fill="#635b85"><ellipse cx="111" cy="137" rx="11" ry="16" /><ellipse cx="170" cy="137" rx="11" ry="16" /></g>
        <ellipse cx="86" cy="158" rx="12" ry="6" fill="#f9afdb" stroke="none" /><ellipse cx="193" cy="158" rx="12" ry="6" fill="#f9afdb" stroke="none" />
        <path d="M125 159q15 16 30 0" fill="#fffefa" />
        <path d="M69 136v-19c0-42 28-66 71-66s73 24 73 66v19" strokeWidth="12" />
        <path d="M69 136v-19c0-42 28-66 71-66s73 24 73 66v19" stroke="#c9ecfc" strokeWidth="5" />
        <rect x="58" y="129" width="21" height="43" rx="9" fill="#c9ecfc" /><rect x="204" y="129" width="21" height="43" rx="9" fill="#c9ecfc" />
        <g className="mascot-flower" transform="translate(176 52)"><path d="M0-8C-17-28-25-8-10 1c-23 2-17 24 1 13 1 22 23 17 14-1 23 3 24-18 4-19 12-19-7-28-9-2z" fill="#f89ed9" strokeWidth="2" /><circle cx="1" cy="4" r="5" fill="#fff4a8" strokeWidth="2" /></g>
      </g>
    </>}
  </svg>
}
