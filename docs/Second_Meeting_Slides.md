Slide 1 — Title
- Title: PortfolioIQ — Capstone Project: Progress Update (Meeting 2)
- Subtitle: April 2026 — What’s been implemented since the first meeting
- Presenter: [Your Name]
- Project links: repo, demo URL (if any)

Slide 2 — Quick Recap (First Meeting)
- Goal: lightweight portfolio tracker with Monte Carlo analytics, alerts, and real-time-ish pricing
- Architecture: React Native (Expo), Firebase Auth / Firestore, AsyncStorage for local prefs, JS simulation engine
- Key asks from first meeting:
  - Monte Carlo simulation (GBM, correlated assets)
  - Non-blocking compute (worker + fallback)
  - Basic Settings and user preferences

Slide 3 — New Features & Changes (High Level)
- Monte Carlo engine: seedable RNG, Student‑t tails option, Ledoit‑Wolf shrinkage for correlation
- UI: Monte Carlo control refinements (mu cap, sigma fallback, better percentile visuals, ghost path styling)
- Async compute: background worker runner with main‑thread fallback for mobile
- Settings screen: profile edit, password reset, notifications toggle, currency picker, price refresh preference (persisted), loading skeletons

Slide 4 — Technical Highlights
- Determinism: `mulberry32` PRNG + smoke tests (seeded runs reproduce P10/P50/P90 & CVaR)
- Tail-risk modeling: Student‑t scaling option to emulate heavy tails (df control in engine)
- Stability & robustness: clamped mu values, NaN guards, defensive upserts to user docs
- Persistence: preferences saved to Firestore and `AsyncStorage` (`priceRefreshInterval` used by price-fetching service)

Slide 5 — Bugs Fixed / Infra Work
- Reverted accidental `type: "module"` change to avoid Expo bundler issues; cleared Metro cache
- Fixed Firestore update errors by using `setDoc(..., { merge: true })` to upsert user profile
- Fixed portfolio race conditions (fetchId guard) and value NaNs (purchasePrice fallback)

Slide 6 — Demo / Screenshots
- Monte Carlo: controls (seed, mu cap, sigma fallback), percentile band, ghost path visuals
- Settings: profile edit dialog, currency picker, notifications switch, price refresh chips
- (Add screenshots or run live demo)

Slide 7 — Timeline & Next Steps
- Short milestones (proposal):
  - Alpha demo (internal): 1 week — 2026-04-16 — finish demo screens + Monte Carlo UI polish
  - Beta (user testing): 3 weeks — 2026-04-30 — finalize Settings flows, integrate price refresh consumer, add full delete-account flow
  - Release candidate: 6 weeks — 2026-05-14 — add tests, CI checks, final polishing, prepare capstone presentation
- Immediate next tasks:
  - Implement full `deleteUserAccount` (reauth + cleanup)
  - Propagate profile changes into `AuthContext` so UI updates everywhere
  - Have `stockAPI` read `AsyncStorage` `priceRefreshInterval` and respect chosen interval

Slide 8 — Asks & Risks
- Asks: access to sample users for testing, permission to run small-scale hosted price fetcher for refresh testing
- Risks: realtime price quotas, reauth complexity for account deletion, Expo config constraints (ESM)

Slide 9 — Questions / Demos
- Live demo request
- Feedback requested on timeline and priority items

---
Notes:
- Replace placeholders (presenter name, repo/demo links) before presenting.
- Add screenshots to Slide 6 from the simulator and Settings screen for visual impact.
