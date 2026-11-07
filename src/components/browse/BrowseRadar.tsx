'use client'

/**
 * Decorative radar illustration for the Browse empty state.
 * Not a live scanner — static SVG with optional reduced-motion-safe pulse.
 */
export function BrowseRadar({
  cityLabel,
  className = '',
}: {
  cityLabel?: string
  className?: string
}) {
  const place = cityLabel?.trim() || 'your area'

  return (
    <div
      className={`relative overflow-hidden rounded-lg bg-[linear-gradient(160deg,#F8FBFF_0%,#EEF4FF_55%,#E8F0FC_100%)] ${className}`}
      data-testid="browse-radar"
      aria-hidden
    >
      <svg
        viewBox="0 0 420 360"
        className="h-full w-full"
        role="presentation"
        focusable="false"
      >
        <defs>
          <radialGradient id="browse-radar-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#1D5CE5" stopOpacity="0.12" />
            <stop offset="55%" stopColor="#1D5CE5" stopOpacity="0.04" />
            <stop offset="100%" stopColor="#1D5CE5" stopOpacity="0" />
          </radialGradient>
        </defs>

        <rect width="420" height="360" fill="url(#browse-radar-glow)" />

        {/* Concentric rings */}
        {[48, 88, 128, 168].map((r) => (
          <circle
            key={r}
            cx="210"
            cy="188"
            r={r}
            fill="none"
            stroke="#B7C9E8"
            strokeWidth="1"
            strokeOpacity="0.55"
          />
        ))}

        {/* Crosshair */}
        <line x1="210" y1="20" x2="210" y2="356" stroke="#C5D4EC" strokeWidth="1" />
        <line x1="42" y1="188" x2="378" y2="188" stroke="#C5D4EC" strokeWidth="1" />

        {/* Soft sweep wedge (static; CSS animates opacity when motion allowed) */}
        <path
          className="browse-radar-sweep"
          d="M210 188 L210 40 A148 148 0 0 1 340 120 Z"
          fill="#1D5CE5"
          fillOpacity="0.06"
        />

        {/* Distance ticks */}
        <text x="286" y="176" fill="#94A3B8" fontSize="10" fontWeight="600">
          10 mi
        </text>
        <text x="336" y="176" fill="#94A3B8" fontSize="10" fontWeight="600">
          25 mi
        </text>

        {/* Floating category accents (decorative labels, not live jobs) */}
        <g>
          <rect x="52" y="72" width="118" height="28" rx="6" fill="white" stroke="#E2E8F0" />
          <circle cx="68" cy="86" r="4" fill="#1D4ED8" />
          <text x="78" y="90" fill="#071330" fontSize="11" fontWeight="600">
            Moving
          </text>
        </g>
        <g>
          <rect x="268" y="58" width="118" height="28" rx="6" fill="white" stroke="#E2E8F0" />
          <circle cx="284" cy="72" r="4" fill="#BE123C" />
          <text x="294" y="76" fill="#071330" fontSize="11" fontWeight="600">
            Pet care
          </text>
        </g>
        <g>
          <rect x="288" y="248" width="108" height="28" rx="6" fill="white" stroke="#E2E8F0" />
          <circle cx="304" cy="262" r="4" fill="#047857" />
          <text x="314" y="266" fill="#071330" fontSize="11" fontWeight="600">
            Tutoring
          </text>
        </g>

        {/* Center pin */}
        <circle cx="210" cy="188" r="18" fill="#1D5CE5" fillOpacity="0.12" />
        <circle cx="210" cy="188" r="8" fill="#1D5CE5" />
        <circle cx="210" cy="188" r="3" fill="white" />
      </svg>

      <div className="pointer-events-none absolute left-4 top-4 inline-flex items-center gap-2 rounded-md bg-[#071330] px-2.5 py-1.5 text-[11.5px] font-semibold text-white shadow-sm">
        <span className="browse-radar-dot relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
        Near {place}
      </div>
    </div>
  )
}
