export function MotifLayer() {
  return (
    <>
      {/* Paisley washes */}
      <svg
        className="pointer-events-none absolute opacity-10"
        style={{ width: 520, height: 440, right: -120, top: '20%', color: '#0F766E' }}
        viewBox="0 0 240 200"
        fill="none"
        aria-hidden="true"
      >
        <g stroke="currentColor" strokeWidth="1" strokeLinecap="round" fill="none">
          <path d="M120 30 C 70 50 50 100 70 150 C 90 185 150 180 170 145 C 190 110 180 60 130 32" />
          <path d="M120 55 C 90 70 80 105 95 135 C 110 160 145 158 158 132 C 170 105 160 70 128 56" />
          <path d="M120 80 C 105 90 100 110 110 130 C 122 148 140 142 145 122 C 150 100 138 82 122 80" />
        </g>
      </svg>
      <svg
        className="pointer-events-none absolute opacity-[0.09]"
        style={{ width: 380, height: 320, left: -80, bottom: '6%', color: '#0F766E', transform: 'rotate(140deg)' }}
        viewBox="0 0 240 200"
        fill="none"
        aria-hidden="true"
      >
        <g stroke="currentColor" strokeWidth="1" strokeLinecap="round" fill="none">
          <path d="M120 30 C 70 50 50 100 70 150 C 90 185 150 180 170 145 C 190 110 180 60 130 32" />
          <path d="M120 55 C 90 70 80 105 95 135 C 110 160 145 158 158 132 C 170 105 160 70 128 56" />
        </g>
      </svg>

      {/* Left motifs */}
      <div className="motif" style={{ left: '12%', top: '26%', width: 110, height: 30, transform: 'rotate(-6deg)' }}>
        <svg viewBox="0 0 110 30" fill="none">
          <path d="M2 18 C 16 4, 28 28, 42 14 S 70 28, 84 12 S 104 24, 108 16" stroke="#115E59" strokeWidth="1.4" strokeLinecap="round" fill="none" />
        </svg>
      </div>
      <div className="motif" style={{ left: '13%', top: '38%', width: 110, height: 90 }}>
        <svg viewBox="0 0 110 90" fill="none">
          <rect x="3" y="3" width="100" height="68" rx="8" stroke="#115E59" strokeWidth="1.5" fill="none" />
          <line x1="22" y1="32" x2="84" y2="32" stroke="#115E59" strokeWidth="1.5" strokeLinecap="round" />
          <line x1="22" y1="44" x2="68" y2="44" stroke="#115E59" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M30 71 L40 86 L50 71 Z" fill="#F0FDFA" stroke="#115E59" strokeWidth="1.5" strokeLinejoin="round" />
        </svg>
      </div>
      <div className="motif rounded-full border border-[#134E4A]" style={{ left: '23%', top: '32%', width: 8, height: 8 }} />
      <div className="motif" style={{ left: '5%', bottom: '22%', width: 88, height: 130 }}>
        <svg viewBox="0 0 88 130" fill="none">
          <rect x="2" y="2" width="84" height="126" fill="#F59E0B" stroke="#115E59" strokeWidth="1.5" />
          <g fill="#115E59">
            {[16, 36, 56, 76, 96, 116].map(cy =>
              [16, 36, 56, 76].map(cx => (
                <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="2.5" />
              ))
            )}
          </g>
        </svg>
      </div>
      <div className="motif" style={{ left: '19%', bottom: '24%', width: 92, height: 100 }}>
        <svg viewBox="0 0 92 100" fill="none">
          <rect x="2" y="2" width="88" height="96" stroke="#115E59" strokeWidth="1.5" fill="#fff" />
          <path d="M30 78 L60 30 M60 30 L48 30 M60 30 L60 42" stroke="#115E59" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <div className="motif" style={{ left: '24%', bottom: '36%', width: 90, height: 28, transform: 'rotate(8deg)' }}>
        <svg viewBox="0 0 90 28" fill="none">
          <path d="M2 14 C 14 2, 24 24, 36 12 S 60 24, 72 12 S 84 22, 88 16" stroke="#115E59" strokeWidth="1.4" strokeLinecap="round" fill="none" />
        </svg>
      </div>
      <div className="motif rounded-full" style={{ left: '30%', bottom: '28%', width: 5, height: 5, background: '#134E4A' }} />

      {/* Right motifs */}
      <div className="motif" style={{ right: '14%', top: '28%', width: 130, height: 36 }}>
        <svg viewBox="0 0 130 36" fill="none">
          <path d="M2 22 C 18 4, 32 30, 50 14 S 80 30, 96 14 S 122 28, 128 18" stroke="#115E59" strokeWidth="1.4" strokeLinecap="round" fill="none" />
        </svg>
      </div>
      <div className="motif" style={{ right: '17%', top: '40%', width: 100, height: 78 }}>
        <svg viewBox="0 0 100 78" fill="none">
          <rect x="2" y="2" width="96" height="62" rx="4" stroke="#115E59" strokeWidth="1.5" fill="#fff" />
          <line x1="20" y1="32" x2="80" y2="32" stroke="#115E59" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </div>
      <div className="motif rounded-full" style={{ right: '28%', top: '50%', width: 6, height: 6, background: '#134E4A' }} />
      <div className="motif" style={{ right: '22%', bottom: '30%', width: 130, height: 32 }}>
        <svg viewBox="0 0 130 32" fill="none">
          <path d="M2 16 C 16 2, 30 28, 46 14 S 76 28, 92 12 S 118 26, 128 18" stroke="#115E59" strokeWidth="1.4" strokeLinecap="round" fill="none" />
        </svg>
      </div>
      <div className="motif" style={{ right: '6%', bottom: '22%', width: 78, height: 132 }}>
        <svg viewBox="0 0 78 132" fill="none">
          <rect x="2" y="2" width="74" height="128" fill="#F59E0B" stroke="#115E59" strokeWidth="1.5" />
          <g fill="#115E59">
            {[16, 36, 56, 76, 96, 116].map(cy =>
              [14, 32, 50, 68].map(cx => (
                <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="2.5" />
              ))
            )}
          </g>
        </svg>
      </div>
    </>
  )
}
