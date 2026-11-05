import { Eye, Handshake, MapPinned, MessageSquareWarning, ShieldCheck } from 'lucide-react'
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
    title: 'Demo note',
    body: 'This MVP stores everything in your browser. There is no real identity verification or payments yet.',
  },
]

export function Safety() {
  return (
    <div className="px-4 py-6">
      <SectionHeader
        title="Safety"
        subtitle="Hyper-local help works when expectations are clear and the job stays narrow."
      />

      <div className="relative mb-8 overflow-hidden rounded-3xl border border-beam-line">
        <img
          src="https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=1400&q=80"
          alt="Neighbors outdoors"
          className="h-48 w-full object-cover md:h-56"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-beam-base via-beam-base/50 to-transparent" />
        <p className="absolute bottom-4 left-4 right-4 font-display text-2xl text-beam-cream md:text-3xl">
          Clear price. Clear timing. Local trust.
        </p>
      </div>

      <ul className="space-y-4">
        {tips.map(({ icon: Icon, title, body }) => (
          <li key={title} className="flex gap-4 rounded-2xl border border-beam-line bg-beam-raised p-4">
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
    </div>
  )
}
