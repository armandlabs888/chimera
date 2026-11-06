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
    <section className="border-t border-white/[0.07] bg-[#121317] py-5" aria-label="What Beam includes">
      <div className="section-inner flex flex-wrap items-center gap-2">
        {CHIPS.map(({ label, icon: Icon }) => (
          <span
            key={label}
            className="inline-flex items-center gap-2 rounded-full border border-white/[0.1] bg-[#16181D] px-3 py-1.5 text-[13px] text-[#A7A39C]"
          >
            <Icon className="h-3.5 w-3.5 text-[#DDA352]" strokeWidth={2} />
            {label}
          </span>
        ))}
      </div>
    </section>
  )
}
