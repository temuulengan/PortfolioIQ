Slide 1 — Title (Speaker Notes)
- "Hello — I’m [Your Name]. This is the second progress update for the PortfolioIQ capstone. Today I’ll walk through what I implemented since our first meeting, the technical highlights, bug fixes, and the timeline toward completion."

Slide 2 — Quick Recap (Speaker Notes)
- "At the first meeting we agreed on a lightweight mobile portfolio tracker built with Expo and Firebase, with Monte Carlo analytics for scenario planning. The core asks were: accurate Monte Carlo with correlated assets, non-blocking compute, and a basic settings/preferences flow."

Slide 3 — New Features & Changes (Speaker Notes)
- "Since then I built out the Monte Carlo engine and its UI controls. The engine now supports a seedable RNG so results can be reproduced for testing, an optional Student‑t tail model for heavy‑tail scenarios, and Ledoit‑Wolf shrinkage to make correlation estimates more stable for small sample covariance matrices.
- On the UI side the Monte Carlo component was refined: I clamp unrealistic mu inputs, provide a sensible sigma fallback when volatility is missing, improve visual styling for ghost paths and percentile bands, and added a smart y-axis tick formatter so charts remain readable across scales.
- I also implemented a robust asynchronous runner that attempts to run the simulation off the main thread and falls back to the main thread when workers aren’t available on a platform.
- The Settings screen was implemented with immediate save UX for currency and price refresh interval, profile editing (updates both Firebase Auth and Firestore), password reset, and a notifications toggle. Preferences persist to Firestore and `AsyncStorage`."

Slide 4 — Technical Highlights (Speaker Notes)
- "A few technical highlights to call out:
  - Deterministic testing: the simulation uses `mulberry32` and smoke tests to ensure seeded runs reproduce P10/P50/P90/CVaR outputs.
  - Tail-risk: Student‑t option provides realistic heavy-tailed return scenarios, useful for stress testing.
  - Stability: mu values are clamped to avoid runaway drift, and the engine sanitizes non-finite values to prevent NaNs.
  - Persistence: user preferences persist both server-side and locally — price-refresh choices are available to the price-fetch service through `AsyncStorage`."

Slide 5 — Bugs Fixed / Infra Work (Speaker Notes)
- "During development I ran into a couple infra and data issues:
  - I accidentally introduced `type: \"module\"` earlier which broke Expo. I reverted and cleared Metro cache to restore normal bundling.
  - Firestore updates failed when a user doc didn’t exist; I fixed this by switching to `setDoc(..., { merge: true })` to upsert.
  - I fixed portfolio loading race conditions with a fetchId guard and prevented NaNs by falling back to purchasePrice when current price is missing."

Slide 6 — Demo / Screenshots (Speaker Notes)
- "I’ll show a quick demo: the Monte Carlo screen where you can pick seeds, toggle Student‑t tails, and inspect P10/P50/P90 and CVaR; and the Settings screen where we edit profile, change currency, toggle notifications, and pick the price refresh interval."

Slide 7 — Timeline & Next Steps (Speaker Notes)
- "Proposed timeline:
  - Alpha demo internally by 2026-04-16 (one week): finish Monte Carlo polish and screenshots for the capstone report.
  - Beta user testing by 2026-04-30 (three weeks): finish delete-account flow, integrate price-refresh consumer, and collect feedback.
  - Release candidate by 2026-05-14 (six weeks): add tests, CI checks, final polishing, and prepare the capstone presentation.
- Immediate next tasks are: implement a secure `deleteUserAccount` flow (requires re‑auth), update `AuthContext` to reflect profile edits immediately, and make `stockAPI` read the stored `priceRefreshInterval`."

Slide 8 — Asks & Risks (Speaker Notes)
- "For the next phase I’d like:
  - A few test users to run the beta and provide feedback.
  - Permission to run a small hosted price fetcher (cached) to stress-test refresh intervals.
- Risks: pricing API quotas, handling account deletion securely (reauth), and ensuring Expo remains CommonJS-friendly if we consider ESM in the future."

Slide 9 — Questions / Demos (Speaker Notes)
- "That’s the update. I’m ready to demo now and take feedback on the timeline and priorities. What would you like me to show first?"
