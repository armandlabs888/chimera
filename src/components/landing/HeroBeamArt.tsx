/**
 * Original Beam hero artwork — SVG gradients, orbits, and a luminous sweep.
 * Decorative only; pointer-events none + aria-hidden.
 */
export function HeroBeamArt() {
  return (
    <svg
      className="hero-beam-art pointer-events-none"
      viewBox="0 0 1440 900"
      preserveAspectRatio="xMidYMid slice"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
      focusable="false"
    >
      <defs>
        <radialGradient id="hero-void" cx="42%" cy="48%" r="70%">
          <stop offset="0%" stopColor="#0d1b33" />
          <stop offset="45%" stopColor="#07101f" />
          <stop offset="100%" stopColor="#02060f" />
        </radialGradient>

        <radialGradient id="hero-core" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
          <stop offset="18%" stopColor="#b8e7ff" stopOpacity="0.95" />
          <stop offset="42%" stopColor="#3aa7ff" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#3aa7ff" stopOpacity="0" />
        </radialGradient>

        <linearGradient id="hero-beam" x1="0%" y1="50%" x2="100%" y2="48%">
          <stop offset="0%" stopColor="#7fd4ff" stopOpacity="0" />
          <stop offset="8%" stopColor="#9ae0ff" stopOpacity="0.85" />
          <stop offset="28%" stopColor="#2f8fff" stopOpacity="0.75" />
          <stop offset="62%" stopColor="#1a6dff" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#4de0ff" stopOpacity="0" />
        </linearGradient>

        <linearGradient id="hero-beam-soft" x1="0%" y1="50%" x2="100%" y2="50%">
          <stop offset="0%" stopColor="#5ec8ff" stopOpacity="0" />
          <stop offset="12%" stopColor="#5ec8ff" stopOpacity="0.28" />
          <stop offset="55%" stopColor="#2a7dff" stopOpacity="0.12" />
          <stop offset="100%" stopColor="#7cf0ff" stopOpacity="0" />
        </linearGradient>

        <radialGradient id="hero-right-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#6ef0ff" stopOpacity="0.55" />
          <stop offset="40%" stopColor="#2a9dff" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#2a9dff" stopOpacity="0" />
        </radialGradient>

        <radialGradient id="hero-particle" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>

        <mask id="hero-beam-mask">
          <rect width="1440" height="900" fill="black" />
          <ellipse cx="980" cy="430" rx="720" ry="90" fill="white" opacity="0.95" />
          <ellipse cx="980" cy="430" rx="760" ry="160" fill="white" opacity="0.35" />
        </mask>
      </defs>

      <rect width="1440" height="900" fill="url(#hero-void)" />

      {/* Far right atmospheric bloom */}
      <ellipse cx="1320" cy="400" rx="280" ry="220" fill="url(#hero-right-glow)" />
      <ellipse cx="1280" cy="520" rx="200" ry="140" fill="url(#hero-right-glow)" opacity="0.55" />

      {/* Soft beam body */}
      <g mask="url(#hero-beam-mask)">
        <rect x="420" y="300" width="1020" height="260" fill="url(#hero-beam-soft)" />
        <rect x="480" y="380" width="960" height="100" fill="url(#hero-beam)" />
      </g>

      {/* Orbital ellipses */}
      <g
        fill="none"
        stroke="rgba(255,255,255,0.55)"
        strokeWidth="0.85"
        strokeLinecap="round"
      >
        <ellipse cx="620" cy="430" rx="210" ry="118" transform="rotate(-18 620 430)" opacity="0.55" />
        <ellipse cx="620" cy="430" rx="268" ry="150" transform="rotate(-18 620 430)" opacity="0.38" />
        <ellipse cx="620" cy="430" rx="330" ry="186" transform="rotate(-18 620 430)" opacity="0.26" />
        <ellipse cx="620" cy="430" rx="170" ry="96" transform="rotate(12 620 430)" opacity="0.42" />
        <ellipse cx="620" cy="430" rx="390" ry="210" transform="rotate(-8 620 430)" opacity="0.16" />
      </g>

      {/* Deterministic orbital nodes */}
      <g fill="#ffffff">
        <circle cx="448" cy="392" r="2.2" opacity="0.9" />
        <circle cx="512" cy="348" r="1.6" opacity="0.7" />
        <circle cx="718" cy="318" r="2" opacity="0.85" />
        <circle cx="792" cy="372" r="1.5" opacity="0.65" />
        <circle cx="760" cy="508" r="1.8" opacity="0.75" />
        <circle cx="540" cy="534" r="1.4" opacity="0.55" />
        <circle cx="430" cy="470" r="1.7" opacity="0.7" />
        <circle cx="680" cy="560" r="1.3" opacity="0.5" />
        <circle cx="860" cy="440" r="1.6" opacity="0.6" />
      </g>

      {/* Particle cloud near core — fixed positions */}
      <g>
        {[
          [560, 402, 1.1],
          [575, 418, 0.8],
          [590, 395, 1.3],
          [605, 425, 0.7],
          [618, 408, 1.0],
          [632, 438, 0.9],
          [648, 412, 0.7],
          [662, 428, 1.1],
          [678, 400, 0.6],
          [692, 420, 0.8],
          [548, 430, 0.7],
          [582, 448, 0.6],
          [610, 452, 0.9],
          [640, 390, 0.7],
          [670, 450, 0.6],
          [700, 405, 0.8],
          [715, 430, 0.5],
          [730, 415, 0.7],
          [745, 435, 0.55],
          [760, 410, 0.65],
        ].map(([x, y, r], i) => (
          <circle key={i} cx={x} cy={y} r={r} fill="url(#hero-particle)" opacity={0.55 + (i % 5) * 0.08} />
        ))}
      </g>

      {/* Luminous core */}
      <circle cx="590" cy="422" r="78" fill="url(#hero-core)" />
      <circle cx="590" cy="422" r="10" fill="#ffffff" opacity="0.95" />
      <circle cx="590" cy="422" r="22" fill="#c9ecff" opacity="0.35" />
    </svg>
  )
}
