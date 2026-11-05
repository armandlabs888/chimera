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
    <div className="px-4 py-6">
      <SectionHeader
        title="Safety"
        subtitle="Hyper-local help works when expectations are clear and the job stays narrow."
      />

      <div className="relative mb-10 overflow-hidden rounded-2xl">
        <img
          src="https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=1400&q=80"
          alt="Neighbors outdoors"
          className="h-48 w-full object-cover md:h-56"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-beam-base via-beam-base/55 to-transparent" />
        <p className="absolute bottom-4 left-4 right-4 font-display text-2xl text-beam-cream md:text-3xl">
          Clear price. Clear timing. Local trust.
        </p>
      </div>

      <MetaLabel className="mb-4">Basics</MetaLabel>
      <ul className="divide-y divide-white/[0.06]">
        {tips.map(({ icon: Icon, title, body }) => (
          <li key={title} className="flex gap-4 py-5">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-beam-amber-soft text-beam-amber">
              <Icon className="h-5 w-5" />
            </span>
            <div>
              <h2 className="font-display text-xl text-beam-cream">{title}</h2>
              <p className="mt-1 text-sm leading-relaxed text-beam-cream-dim">{body}</p>
            </div>
          </li>
        ))}
      </ul>
      <FlatDivider className="mt-2" />
    </div>
  )
}
