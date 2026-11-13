import Image from 'next/image'

/**
 * Static, non-interactive Browse Jobs product preview for Landing v2.
 * Clearly labeled SAMPLE jobs — never presented as live marketplace data.
 */
/**
 * Category-matched sample photos (must look like the job). Paths are unique
 * within this preview; may overlap marketing sections (smoke excludes preview).
 */
const SAMPLE_JOBS = [
  {
    id: 'clean',
    category: 'House Cleaning',
    title: 'Deep clean after move-out',
    meta: 'Today · Sample area',
    src: '/images/landing/avail-house-cleaning.jpg',
  },
  {
    id: 'auto',
    category: 'Auto Detailing',
    title: 'Interior wipe for weekend trip',
    meta: 'Tomorrow · Sample area',
    src: '/images/landing/avail-auto-detailing.jpg',
  },
  {
    id: 'pets',
    category: 'Pet Sitting',
    title: 'Afternoon walk · 2 dogs',
    meta: 'This week · Sample area',
    src: '/images/landing/avail-pet-sitting.jpg',
  },
  {
    id: 'junk',
    category: 'Junk Removal',
    title: 'Haul old dresser to curb',
    meta: 'ASAP · Sample area',
    src: '/images/landing/avail-junk-removal.jpg',
  },
  {
    id: 'carpet',
    category: 'Carpet Cleaning',
    title: 'Living room rug refresh',
    meta: 'Today · Sample area',
    src: '/images/landing/avail-carpet-cleaning.jpg',
  },
  {
    id: 'groom',
    category: 'Grooming',
    title: 'Bath for medium dog',
    meta: 'Tomorrow · Sample area',
    src: '/images/landing/avail-grooming.jpg',
  },
] as const

export function LandingBrowsePreview() {
  return (
    <div
      className="relative z-0 mx-auto mt-10 max-w-[1200px] px-4 pb-8 md:mt-14 md:px-8 md:pb-10"
      data-testid="landing-browse-preview"
    >
      <div
        className="landing-preview-stack mx-auto max-w-[1080px]"
        role="img"
        aria-label="Illustrative Browse Local Jobs product preview with sample jobs, not live activity"
      >
        <div
          className="landing-preview-card overflow-hidden rounded-[16px] border border-[#D7E0EC]/90 bg-white shadow-[0_32px_80px_rgba(7,19,48,0.22),0_8px_24px_rgba(7,19,48,0.10)]"
          aria-hidden="true"
        >
          <div className="flex items-center gap-3 border-b border-[#D7E0EC] bg-[#F8FAFC] px-3 py-2">
            <div className="flex gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-[#FF5F57]" />
              <span className="h-2.5 w-2.5 rounded-full bg-[#FEBC2E]" />
              <span className="h-2.5 w-2.5 rounded-full bg-[#28C840]" />
            </div>
            <div className="flex min-w-0 flex-1 justify-center">
              <div className="w-full max-w-md truncate rounded-[7px] border border-[#D7E0EC] bg-white px-3 py-1 text-center text-[11px] text-[#475569]">
                yariapp.com/browse · sample jobs (illustrative)
              </div>
            </div>
          </div>

          <div className="bg-[#F4F8FD] p-2.5 md:p-3.5">
            <div className="mb-2.5 flex items-center justify-between gap-2 rounded-[10px] border border-[#D7E0EC] bg-white px-3 py-1.5">
              <div className="text-[13px] font-bold tracking-[-0.02em] text-[#1D5CE5]">beam</div>
              <div className="hidden gap-4 text-[11px] font-medium text-[#071330] sm:flex">
                <span>Services</span>
                <span>How it works</span>
                <span>Find work</span>
              </div>
              <div className="flex items-center gap-2 text-[11px]">
                <span className="rounded-[7px] border border-[#D7E0EC] px-2 py-1 text-[#071330]">
                  San Jose, CA
                </span>
                <span className="hidden text-[#071330] sm:inline">Log in</span>
                <span className="rounded-[7px] bg-[#1D5CE5] px-2.5 py-1 font-semibold text-white">
                  Sign up
                </span>
              </div>
            </div>

            <div className="grid gap-2.5 lg:grid-cols-[184px_minmax(0,1fr)_184px]">
              <aside className="hidden rounded-[10px] border border-[#D7E0EC] bg-white p-2.5 lg:block">
                <p className="text-[10px] font-semibold uppercase tracking-[0.06em] text-[#94A3B8]">
                  Filters
                </p>
                <p className="mt-2.5 text-[10px] font-semibold uppercase tracking-[0.04em] text-[#94A3B8]">
                  Category
                </p>
                <ul className="mt-1 space-y-0.5 text-[11px]">
                  <li className="flex justify-between rounded-[7px] bg-[#EEF4FF] px-2 py-1.5 font-semibold text-[#1D5CE5]">
                    <span>All</span>
                    <span>6</span>
                  </li>
                  {['Home', 'Auto', 'Junk Removal', 'Pets', 'Other'].map((label, i) => (
                    <li key={label} className="flex justify-between px-2 py-1 text-[#071330]">
                      <span>{label}</span>
                      <span className="text-[#64748B]">{[2, 1, 1, 2, 0][i]}</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-2.5 text-[10px] font-semibold uppercase tracking-[0.04em] text-[#94A3B8]">
                  Timing
                </p>
                <div className="mt-1 flex flex-wrap gap-1">
                  <span className="rounded-[6px] bg-[#F4F8FD] px-1.5 py-1 text-[10px] font-semibold text-[#071330]">
                    Any
                  </span>
                  <span className="rounded-[6px] border border-[#D7E0EC] px-1.5 py-1 text-[10px] text-[#071330]">
                    ASAP
                  </span>
                  <span className="rounded-[6px] border border-[#D7E0EC] px-1.5 py-1 text-[10px] text-[#071330]">
                    Today
                  </span>
                </div>
                <p className="mt-3 text-[11px] font-semibold text-[#1D5CE5]">Safety guidelines →</p>
              </aside>

              <div className="min-w-0">
                <div className="mb-2 flex flex-wrap items-end justify-between gap-2">
                  <div>
                    <p className="text-[16px] font-bold tracking-[-0.02em] text-[#071330] md:text-[18px]">
                      Browse Local Jobs
                    </p>
                    <p className="text-[10px] text-[#64748B]">
                      Illustrative samples for design review, not live activity
                    </p>
                  </div>
                  <div className="flex rounded-[7px] border border-[#D7E0EC] bg-white p-0.5 text-[10px]">
                    <span className="rounded-[6px] bg-[#1D5CE5] px-2 py-1 font-semibold text-white">
                      Open requests · 6
                    </span>
                    <span className="rounded-[6px] px-2 py-1 font-medium text-[#071330]">
                      Local helpers
                    </span>
                  </div>
                </div>
                <div className="mb-2 flex gap-1.5 rounded-[10px] border border-[#D7E0EC] bg-white p-1.5">
                  <div className="flex flex-1 items-center gap-1.5 rounded-[7px] bg-[#F4F8FD] px-2 py-1.5 text-[11px] text-[#94A3B8]">
                    Search jobs
                  </div>
                  <div className="hidden rounded-[7px] border border-[#D7E0EC] px-2 py-1.5 text-[11px] text-[#071330] sm:block">
                    Any timing
                  </div>
                  <div className="rounded-[7px] border border-[#D7E0EC] px-2 py-1.5 text-[11px] text-[#071330]">
                    Newest
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {SAMPLE_JOBS.map((job, index) => (
                    <article
                      key={job.id}
                      className={`overflow-hidden rounded-[10px] border border-[#D7E0EC] bg-white ${
                        index > 2 ? 'hidden sm:block' : ''
                      }`}
                    >
                      <Image
                        src={job.src}
                        alt=""
                        width={320}
                        height={72}
                        className="h-[72px] w-full object-cover"
                        loading="lazy"
                        sizes="(max-width: 640px) 90vw, 200px"
                      />
                      <div className="p-2">
                        <p className="text-[9px] font-semibold uppercase tracking-[0.04em] text-[#1D5CE5]">
                          {job.category} · sample
                        </p>
                        <p className="mt-0.5 text-[12px] font-semibold leading-snug text-[#071330]">
                          {job.title}
                        </p>
                        <p className="mt-1 text-[10px] text-[#64748B]">{job.meta}</p>
                      </div>
                    </article>
                  ))}
                </div>
              </div>

              <aside className="hidden rounded-[10px] border border-[#D7E0EC] bg-white p-2.5 lg:block">
                <p className="text-[12px] font-bold text-[#071330]">Trending helpers</p>
                <p className="mt-1 text-[10px] leading-4 text-[#64748B]">
                  Illustrative nearby people, not live profiles.
                </p>
                <div className="mt-2.5 space-y-2.5">
                  <div className="flex items-center gap-2 border-b border-[#D7E0EC] pb-2.5">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#D7E0EC] text-[10px] font-bold text-[#071330]">
                      MR
                    </div>
                    <div>
                      <p className="text-[12px] font-semibold text-[#071330]">Maya R.</p>
                      <p className="text-[10px] text-[#64748B]">House Cleaning · sample</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#C5D4E8] text-[10px] font-bold text-[#071330]">
                      DK
                    </div>
                    <div>
                      <p className="text-[12px] font-semibold text-[#071330]">Devon K.</p>
                      <p className="text-[10px] text-[#64748B]">Junk Removal · sample</p>
                    </div>
                  </div>
                </div>
              </aside>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
