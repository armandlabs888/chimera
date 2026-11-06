import { Clock3, MessagesSquare, ShieldCheck, Sparkles, Wallet } from 'lucide-react'

const CHIPS = [
  { label: 'Six practical categories', icon: Sparkles },
  { label: 'Priced offers + arrival', icon: Clock3 },
  { label: 'In-thread coordination', icon: MessagesSquare },
  { label: 'Bidirectional reviews', icon: ShieldCheck },
  { label: 'Peer-to-peer payments', icon: Wallet },
]

export function LandingTrustStrip() {
  return (
    <section className="border-b border-black/[0.05] bg-white py-4" aria-label="What Beam includes">
      <div className="section-inner flex flex-wrap items-center gap-2">
        {CHIPS.map(({ label, icon: Icon }) => (
          <span
            key={label}
            className="inline-flex items-center gap-2 rounded-full bg-beam-canvas px-3 py-1.5 type-sec font-medium text-beam-cream-dim shadow-[0_0_0_1px_rgba(15,23,42,0.06)]"
          >
            <Icon className="h-3.5 w-3.5 text-beam-amber-deep" strokeWidth={2} />
            {label}
          </span>
        ))}
      </div>
    </section>
  )
}
