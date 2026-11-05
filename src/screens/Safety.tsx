import { Eye, Handshake, MapPinned, MessageSquareWarning, ShieldCheck } from 'lucide-react'
import { FlatDivider, MetaLabel } from '../components/flat'
import { SectionHeader } from '../components/ui'

const tips = [
  {
    icon: Handshake,
    title: 'Agree in Beam first',
    body: 'Accept an offer with a named price before anyone shows up. Keep scope changes in the thread.',
  },
  {
    icon: MapPinned,
    title: 'Meet in public when you can',
    body: 'For first-time helpers, prefer lobbies, yards, or daytime windows. Share the plan with someone you trust.',
  },
  {
    icon: Eye,
    title: 'Trust signals over chatter',
    body: 'Beam ranks skill, distance, and availability — then reviews after completion. No social feed to skim.',
  },
  {
    icon: MessageSquareWarning,
    title: 'What Beam is not for',
    body: 'No licensed trades, childcare, senior care, or delivery/driving. Keep it practical same-day help.',
  },
  {
    icon: ShieldCheck,
    title: 'Payments & accounts',
    body: 'Beam does not hold payments yet. Live accounts persist in Supabase with RLS; explicit demo mode stays in your browser only.',
  },
]

export function Safety() {
  return (
    <div className="px-4 py-5 sm:py-6">
      <SectionHeader
        title="Safety"
        subtitle="Hyper-local help works when expectations are clear and the job stays narrow."
      />

      <div className="relative mb-8 overflow-hidden rounded-[12px]">
        <img
          src="https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=1400&q=80"
          alt="Neighbors outdoors"
          className="h-44 w-full object-cover md:h-52"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/25 to-transparent" />
        <p className="absolute bottom-3 left-4 right-4 text-[22px] font-semibold tracking-tight text-white md:text-[24px]">
          Clear price. Clear timing. Local trust.
        </p>
      </div>

      <MetaLabel className="mb-2 text-beam-amber">Basics</MetaLabel>
      <ul className="divide-y divide-beam-line">
        {tips.map(({ icon: Icon, title, body }) => (
          <li key={title} className="flex gap-3 py-4">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[8px] bg-beam-amber-soft text-beam-amber-deep">
              <Icon className="h-4 w-4" />
            </span>
            <div>
              <h2 className="text-[17px] font-semibold text-beam-cream">{title}</h2>
              <p className="mt-1 type-sec text-beam-muted">{body}</p>
            </div>
          </li>
        ))}
      </ul>
      <FlatDivider className="mt-1" />
    </div>
  )
}
