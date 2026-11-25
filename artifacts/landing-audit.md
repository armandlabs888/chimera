# Bunk landing audit (Harvey-style redesign brief)

Scope: current production landing in `src/components/landing/*` and `landing-v2.css`, judged against four pillars the owner named. This audit is for a **standalone mock only**. It does not change the live site.

Product facts used below come from existing code and safety copy only (location-check verification, offers with proposed price and arrival window, in-app messaging, peer payment, free to post, browse without an account). No invented stats, testimonials, logos, ratings, prices, or helper counts.

---

## 1. Institutional visual restraint

### What works
- Full-bleed hero photo/video already creates presence and a clear first composition.
- Navy overlay and white body keep text readable.
- Popular services photo bento is distinctive and category-true.
- Footer is already dark and quiet.

### What hurts
- After the hero, the page flips to a bright SaaS white with soft photo cards and rounded tiles. That reads consumer marketplace, not institutional trust.
- Headings use the same heavy sans as the rest of the UI. There is no editorial hierarchy (serif display vs clean body).
- Depth comes from photo gradients and scale hovers more than from structure. Harvey-style restraint prefers 1px low-opacity borders, controlled line length, and large quiet margins.
- Accent blue appears often in eyebrows, chips, and CTAs, so it stops feeling intentional.

### Prioritized fixes
1. **P0** Recast the page on a near-black / deep charcoal canvas with high-legibility light type and 1px borders instead of card shadows.
2. **P0** Pair an editorial serif for section titles with a clean sans for body and UI chrome. Keep the Bunk wordmark as Outfit 700, text-only.
3. **P1** Use Bunk blue `#1D5CE5` sparingly (primary actions and a few structural accents only).
4. **P1** Tighten measure to about 60 to 70ch on prose blocks; give sections more vertical air.

---

## 2. Trust, control, transparency

### What works
- Honest product story: no fake logos, ratings, or helper counts on the live landing.
- How it works is a clear three-step sequence (post, compare offers, chat/finish/review).
- Why Bunk lists real behaviors: see the offer first, message details, leave feedback.
- Safety link is present.

### What hurts
- Verification is a real product gate (helpers confirm home via a location check before offering) but the landing barely surfaces it. Visitors get "trusted" in the hero without seeing the control model.
- How it works is static photo cards. It does not visualize the workflow or let someone preview a job card and offers.
- Why Bunk partly restates How it works (offer comparison appears twice) instead of explaining verification, messaging, and payment clarity.
- "Trusted help, right next door." is strong, but trust is asserted more than demonstrated.

### Prioritized fixes
1. **P0** Add a transparent workflow visualizer: Post a task → Get offers from verified neighbors → Pick, pay, and meet. Keep existing step titles and bodies where possible.
2. **P0** Add an interactive sample preview of a job card and offers, labeled as sample UI, with **no dollar amounts, ratings, or helper counts**.
3. **P0** Rebuild Why Bunk / trust around facts already in product: location-check verification, proposed price and arrival window in offers, in-app messaging, peer payment (Bunk does not hold money).
4. **P1** Keep the safety guidelines link; make it part of the trust section, not an afterthought.

---

## 3. Frictionless conversion

### What works
- Hero search (describe + ZIP + Search) is the right primary CTA and routes into match/browse.
- "Free to post" already appears on the custom-task tile.
- Nav Sign up / Log in and closing "Post a task" give secondary paths without fighting the hero.
- Category tiles are concrete next steps.

### What hurts
- Hero has eyebrow + long headline + lede + search. In three seconds the eye lands on atmosphere before knowing the single action.
- No hesitation-removing microcopy next to the search (posting is free; browsing does not require an account).
- Categories supporting line ("see what neighbors nearby typically charge") is useful but slightly salesy next to a quieter brand direction.
- Closing CTA repeats Post a task without restating the low-friction promise.
- Dual audiences in the lede ("compare helpers" vs "find new work") is accurate but dilutes the primary neighbor-posting job in the first viewport.

### Prioritized fixes
1. **P0** Keep search as the hero's single primary CTA. Add short microcopy under it: free to post, no obligation (true for posting without accepting an offer; browsing works without signup).
2. **P1** Keep the headline; slightly shorten the lede so the action reads first.
3. **P1** Soften the categories supporting line so it invites starting a request without promising price theater.
4. **P2** Closing CTA should echo the same low-friction line, still pointing to Post a task.

---

## 4. Motion

### What works
- Hero respects `prefers-reduced-motion` (static poster instead of video).
- Category hover scale already uses `motion-reduce` guards.

### What hurts
- Motion is mostly media (video loop, image scale). There are almost no section entrance reveals.
- Hover feedback is scale-heavy rather than a restrained border treatment.
- Institutional pages benefit from quiet opacity + translateY reveals on scroll, GPU-friendly and easy to disable.

### Prioritized fixes
1. **P0** Add subtle entrance reveals (opacity + translateY only) on major blocks; disable under `prefers-reduced-motion`.
2. **P1** Prefer 1px border glow / border-color shift on interactive cards instead of large scale zooms.
3. **P2** Keep hero video optional in production; the mock can use the poster still for reliability.

---

## Copy changes in the mock (complete list)

Existing headings and bodies are kept wherever possible. Only these wording changes appear in `artifacts/harvey-mock/`:

| Location | Current (production) | Mock change | Why |
|----------|----------------------|-------------|-----|
| Hero lede | Describe the job, compare helpers nearby, or find new work in your area. | Describe the job and compare offers from neighbors nearby. | Faster read for the primary poster path; helpers still reach Browse / Become a helper in nav. |
| Hero (new) | *(none under search)* | Free to post. No obligation. | Removes hesitation; "Free to post" already exists on the custom tile; posting does not require accepting an offer. |
| Categories support | Pick a category to start a request and see what neighbors nearby typically charge. | Pick a category to start a request. Helpers nearby send offers you can compare. | Same product path without implying live price quotes on the landing. |
| How it works step 2 title | Compare offers | Get offers from verified neighbors | Matches the owner workflow phrasing; verification is a real offer gate. |
| How it works step 2 body | Review proposed price and arrival window before you choose. | *(unchanged)* | Already accurate. |
| How it works step 3 title | Chat, finish & review | Pick, pay, and meet | Aligns with the transparent workflow; messaging and review stay in the body and trust section. |
| How it works step 3 body | Message in-app, complete the job, and leave feedback for others. | Message in-app to agree on details, arrange payment directly, then leave feedback. | Payment peer-to-peer is stated on Safety; still no escrow claim. |
| Why Bunk intro | Clear steps and in-app messaging, so you can compare offers and agree on the details before anyone starts. | Helpers confirm home with a location check before they can offer. You compare proposed price and arrival window, then message in-app before anyone starts. | Surfaces real verification and offer fields without new claims. |
| Why Bunk pillar 01 | See the offer first / Compare proposed price and arrival window before choosing. | *(titles kept; body unchanged)* | Still accurate. |
| Why Bunk (new pillar framing) | Talk through the details / Leave useful feedback | Keep those two; add an explicit verification line in the left column rather than inventing a fourth social-proof pillar. | Avoid duplicating How it works while naming the control model. |
| Closing support | Tell us what you need a hand with. | Tell us what you need a hand with. Free to post. | Echoes hero microcopy. |
| Sample preview chrome | *(not on current v2 landing)* | SAMPLE UI labels on the job card / offers preview; field labels only (Proposed price, Arrival window); no dollar amounts, stars, or counts. | Interactive trust without inventing commercial proof. |

Unchanged on purpose: hero eyebrow, hero H1, Popular Neighborhood Services title and tile copy (including Free to post on custom), How it works eyebrow and H2 "From to-do to done.", step 1 copy, Why Bunk H2 "Know what you're choosing.", safety link label (ampersand kept), closing H2, footer links, nav labels.

---

## Recommended build order for production (after owner approves mock)

1. Visual system (palette, type, borders) on a feature branch behind no route change until approved.
2. Hero microcopy + search retained as sole primary CTA.
3. Workflow visualizer + sample job/offers preview.
4. Trust section rewrite using verification / offers / messaging / peer pay facts.
5. Motion pass with reduced-motion support.
6. QA against existing landing nav and describe-search tests; do not ship invented social proof.

---

## Top issues (short)

1. Bright consumer aesthetic undercuts the "trusted local" claim the hero makes.
2. Verification and offer control are real product strengths but are nearly invisible.
3. Hero conversion lacks a one-line hesitation remover beside the search.
4. How it works is static; a workflow visualizer and sample preview would make the product tangible without fake metrics.
