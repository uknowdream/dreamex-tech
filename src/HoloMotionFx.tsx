/**
 * Reusable lightweight animated SVG holographic HUD overlay for media cards & visual frames.
 * Uses pure GPU-composited transforms & opacity (zero SMIL main-thread ticks or image box shifts).
 */
export function HoloMotionFx({ variant = 'neural' }: { variant?: 'neural' | 'ai' | 'qa' | 'arch' }) {
  const accentA = variant === 'qa' ? '#6ef3c5' : variant === 'arch' ? '#a78bfa' : '#38bdf8'
  const accentB = variant === 'qa' ? '#38bdf8' : variant === 'arch' ? '#f59e0b' : '#c5ff70'

  return (
    <div className={`dx-holo-layer dx-holo-${variant}`} aria-hidden="true">
      <span className="dx-holo-scanline" />
      <svg className="dx-holo-svg" viewBox="0 0 320 180" preserveAspectRatio="none">
        <path
          d="M 10 142 Q 95 36 175 96 T 312 42"
          fill="none"
          stroke={accentA}
          strokeOpacity="0.34"
          strokeWidth="1.2"
          strokeDasharray="5 6"
          className="dx-holo-arc"
        />
        <path
          d="M 24 46 Q 130 154 225 64 T 308 138"
          fill="none"
          stroke={accentB}
          strokeOpacity="0.28"
          strokeWidth="1.1"
          strokeDasharray="4 6"
          className="dx-holo-arc dx-holo-arc-rev"
        />
        <g className="dx-holo-radar" style={{ transformOrigin: '238px 78px' }}>
          <circle cx="238" cy="78" r="34" fill="none" stroke={accentA} strokeOpacity="0.26" strokeDasharray="8 6" />
          <circle cx="272" cy="78" r="3.2" fill={accentB} />
          <circle cx="204" cy="78" r="2.2" fill={accentA} />
        </g>
        <g className="dx-holo-radar dx-holo-radar-inner" style={{ transformOrigin: '238px 78px' }}>
          <circle cx="238" cy="78" r="20" fill="none" stroke={accentB} strokeOpacity="0.32" strokeDasharray="4 5" />
          <circle cx="238" cy="58" r="2.5" fill={accentA} />
        </g>
      </svg>
    </div>
  )
}
