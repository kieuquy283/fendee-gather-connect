# Production Remediation Phase B Map

Date: 2026-08-08

## Scope

Phase B covers the 16 original `P2 HIGH` findings from `reports/mobile-review/issues.csv`.

Goal: fix every locally-fixable P2 without reopening Phase A architecture unless a real defect forces it.

## Dependency Order

1. Mobile shell, hydration, metadata, and navigation safety:
   `MPR-020`, `MPR-023`, `MPR-024`
2. Shared local state and persistence hardening:
   `MPR-011`, `MPR-013`
3. Local resilience and mutation-state modeling:
   `MPR-012`
4. Accessibility and empty/loading/error states:
   `MPR-016`
5. Visual regression and mobile QA expansion:
   `MPR-014`, `MPR-015`
6. Performance baseline and asset/layout stability:
   `MPR-019`
7. Dependency/repo health decisions:
   `MPR-021`, `MPR-022`
8. Backend/platform strategy items that can only be partially prepared:
   `MPR-017`, `MPR-018`, `MPR-026`

## P2 Inventory

### MPR-011

- Category: API Readiness
- Route: All
- Affected files: `src/lib/repositories.ts`, `src/lib/gather-store.tsx`, `src/lib/presence-store.tsx`, `src/lib/privacy-store.tsx`, `src/lib/auth.tsx`, route consumers under `src/routes`
- Root cause: Repository contracts were introduced in Phase A, but the app still mutates local context directly instead of consistently going through a repository-backed domain API.
- Dependency: None, but it should land before resilience and persistence fixes so mutation state is centralized once.
- Implementation plan: Add local repository/adaptor entry points for the major mutable prototype domains, move route-level mutations behind store/domain methods, and standardize async method signatures so loading/error/retry can be modeled consistently.
- Validation method: Typecheck, targeted store tests, E2E around Gather/presence/profile/logout flows, route reload checks.
- Risk: Medium. Touches shared state surfaces but stays inside existing Phase A boundary.
- Estimated effort: Large

### MPR-012

- Category: Network Resilience
- Route: All mutable flows
- Affected files: `src/lib/gather-store.tsx`, `src/lib/presence-store.tsx`, `src/lib/privacy-store.tsx`, `src/lib/auth.tsx`, `src/routes/auth.tsx`, `src/routes/settings.index.tsx`, `src/routes/profile.$id.tsx`, `src/routes/gather.new.tsx`, `src/routes/gather.$id.tsx`, `src/routes/chat.$id.tsx`
- Root cause: Local prototype mutations complete synchronously, so there are no deterministic loading, error, retry, duplicate-submit, or reload-during-mutation semantics.
- Dependency: `MPR-011`.
- Implementation plan: Introduce async local adapters with configurable delay/failure injection; add `idle/loading/success/error` mutation state for presence start/stop/update, Gather publish/RSVP/end, profile update, block/report, auth, and chat send; guard against duplicate taps and expose retry UI.
- Validation method: New Playwright failure/retry/offline tests plus focused store tests.
- Risk: High. This is broad and crosses multiple user flows.
- Estimated effort: Large

### MPR-013

- Category: Persistence
- Route: Presence/Profile/Privacy/Friends
- Affected files: `src/lib/prototype-storage.ts`, `src/lib/presence-store.tsx`, `src/lib/privacy-store.tsx`, `src/lib/auth.tsx`, `src/lib/gather-store.tsx`, route consumers with local persistence assumptions
- Root cause: Gather has some corrupted-state handling, but the other persisted domains do not share versioning, migration, fallback, or logout/account-switch recovery rules.
- Dependency: `MPR-011`.
- Implementation plan: Add versioned codecs/readers for auth, privacy, presence, and theme-related prototype storage; reject malformed data safely; clear incompatible versions; make logout cleanup and reload consistency deterministic across routes.
- Validation method: Unit/integration tests for corrupted storage and version fallback, E2E reload/logout checks.
- Risk: Medium.
- Estimated effort: Medium

### MPR-014

- Category: Testing
- Route: Whole app
- Affected files: `tests/`, `playwright.config.ts`, helper fixtures, major route components
- Root cause: Playwright coverage is heavily Gather-centered, so Nearby, auth, home, friends, chat, notifications, settings, and widgets can regress without detection.
- Dependency: `MPR-012`, `MPR-016`, `MPR-024`.
- Implementation plan: Add whole-app mobile E2E coverage for navigation, signed-out deep links, presence states, invalid IDs, long content, empty states, and mutation failure/retry flows.
- Validation method: New Playwright suites integrated into `npm run test:e2e`.
- Risk: Medium.
- Estimated effort: Large

### MPR-015

- Category: Visual Regression
- Route: Whole app
- Affected files: `tests/`, `reports/mobile-review/visual/`, route UIs, shared shell/components
- Root cause: Only Gather has screenshot coverage, leaving the rest of the mobile app unguarded against overflow, overlap, and broken empty/error states.
- Dependency: `MPR-024`, `MPR-016`.
- Implementation plan: Expand visual capture and no-overflow checks to Home, Nearby, Chat, Profile, Notifications, Settings, and presence states at `360/390/430`, with a `320` smoke pass for layout risk.
- Validation method: New Playwright visual suite and exported screenshots under `reports/mobile-review/visual/`.
- Risk: Medium.
- Estimated effort: Medium

### MPR-016

- Category: Accessibility
- Route: Whole app
- Affected files: `src/components/fendee/AppShell.tsx`, `src/components/fendee/sheets.tsx`, `src/components/fendee/presence.tsx`, `src/components/fendee/gather-v2.tsx`, `src/routes/*`, Playwright tests
- Root cause: There is no automated accessibility regression coverage, no live-region announcements for dynamic status, and no focused keyboard/focus audit for mobile sheets, tabs, composer, and route states.
- Dependency: Shell and state fixes from `MPR-024` and `MPR-012`.
- Implementation plan: Add automated a11y checks where possible, improve accessible names/focus order/live regions/target sizes on the major flows, and fix route-level empty/error/loading semantics that currently rely on color or visual context alone.
- Validation method: Playwright accessibility assertions, keyboard-flow tests, manual focus checks at core routes.
- Risk: Medium.
- Estimated effort: Medium

### MPR-017

- Category: PWA Mobile Web
- Route: Root/Public
- Affected files: `public/`, `src/routes/__root.tsx`, build metadata files
- Root cause: The app has no manifest, install metadata, or offline shell strategy, so mobile-web release characteristics are incomplete.
- Dependency: `MPR-023` metadata cleanup.
- Implementation plan: Add a minimal manifest/theme/app-name metadata and document an intentionally limited offline strategy if a full service worker would exceed Phase B scope.
- Validation method: Build output inspection, manifest presence, browser installability checks, screenshot coverage.
- Risk: Medium.
- Estimated effort: Medium

### MPR-018

- Category: Native Wrapper Readiness
- Route: App architecture
- Affected files: `src/lib/`, `src/routes/__root.tsx`, presence/auth/notification abstractions
- Root cause: Web-only assumptions are embedded in permission, storage, deep-link, and notification flows.
- Dependency: `MPR-011`, `MPR-017`.
- Implementation plan: Introduce lightweight platform-service interfaces for storage, external links, permission state, and notification capability without changing product behavior; document native gaps still requiring backend/platform work.
- Validation method: Typecheck, focused unit tests for interfaces, report updates.
- Risk: Medium.
- Estimated effort: Large

### MPR-019

- Category: Performance
- Route: Whole app
- Affected files: `src/routes/__root.tsx`, `src/components/fendee/AppShell.tsx`, `src/components/fendee/nearby-radar.tsx`, `src/components/fendee/nearby-canvas.tsx`, `src/lib/fendee-data.ts`, visual assets, Playwright/perf tooling
- Root cause: There is no objective mobile performance baseline, while hydration warnings, third-party avatars, and large route files increase the chance of poor LCP/CLS/INP.
- Dependency: `MPR-020`, `MPR-024`, asset/layout stabilization.
- Implementation plan: Measure baseline, fix provable local issues such as hydration mismatch, unstable image dimensions, expensive initial rendering, or unnecessary third-party avatar shifts, and record before/after in a performance report.
- Validation method: Performance script/report, build stats, browser traces, screenshot comparison.
- Risk: Medium.
- Estimated effort: Medium

### MPR-020

- Category: SSR Hydration
- Route: Root/Gather
- Affected files: `src/routes/__root.tsx`, `src/lib/theme.ts`, `src/lib/gather-store.tsx`, possibly `src/lib/presence-store.tsx`
- Root cause: Server-rendered root HTML does not consistently match client-hydrated theme/store state, producing console hydration warnings during QA.
- Dependency: None. This should be fixed first because it can mask other Phase B regressions.
- Implementation plan: Stabilize root theme initialization and any client-only seeded state reads so SSR markup matches first client render; add console-clean assertions in E2E for affected flows.
- Validation method: `npm run test:e2e` with console monitoring, build verification, targeted manual route smoke.
- Risk: Medium.
- Estimated effort: Medium

### MPR-021

- Category: Dependency Management
- Route: Repo root
- Affected files: `package-lock.json`, `bun.lock`, optional `.gitignore` or repo docs
- Root cause: Two lockfiles imply two package managers and create drift in installs and audits.
- Dependency: Team/package-manager decision, but local repo can still be normalized if npm remains the chosen tool.
- Implementation plan: Confirm npm as authoritative from scripts and current workflow, then remove or explicitly deprecate the Bun lockfile and document the package-manager choice.
- Validation method: `npm install` parity, git diff, updated report.
- Risk: Low.
- Estimated effort: Small

### MPR-022

- Category: Dependency Health
- Route: Repo root
- Affected files: `package.json`, `package-lock.json`, installed tree, reports
- Root cause: The installed tree contains extraneous packages and there is no current audit/outdated baseline.
- Dependency: `MPR-021`.
- Implementation plan: Run `npm outdated` and `npm audit`, inspect `npm ls --depth=0`, remove truly unused/extraneous packages if safe locally, and document deferred upgrades or vulnerabilities that require larger work.
- Validation method: Dependency commands, clean install parity, build/test rerun.
- Risk: Low.
- Estimated effort: Small

### MPR-023

- Category: Metadata SEO Privacy
- Route: Root
- Affected files: `src/routes/__root.tsx`, `public/robots.txt`, optional app icons/manifest metadata
- Root cause: Root metadata still uses Lovable scaffold content and crawling is allowed for private prototype paths.
- Dependency: None.
- Implementation plan: Replace generic metadata with Fendee-specific titles/descriptions, add noindex/crawl restrictions appropriate for authenticated routes and prototype release posture, align with any Phase B PWA metadata.
- Validation method: Build output review, head tag inspection, robots file verification.
- Risk: Low.
- Estimated effort: Small

### MPR-024

- Category: Mobile Layout
- Route: Whole app
- Affected files: `src/components/fendee/AppShell.tsx`, `src/components/fendee/ui.tsx`, `src/components/fendee/sheets.tsx`, `src/routes/chat.$id.tsx`, `src/routes/home.tsx`, `src/routes/nearby.index.tsx`, `src/routes/profile.*`, `src/routes/notifications.tsx`, `src/routes/settings.*`
- Root cause: The global shell is tuned to 360-430 px demo widths; six-tab bottom navigation, sticky bars, fixed composer/sheets, and long-label states are not hardened for `320`, short viewport, landscape, or keyboard overlap.
- Dependency: None. This is the first major product-facing local fix.
- Implementation plan: Audit all primary routes at `320/360/375/390/393/412/430`, improve shell spacing/safe-area logic/tab density, harden fixed composer/sheet overflow, and add shared empty/error/loading surfaces where missing.
- Validation method: Expanded visual QA, no-overflow assertions, manual landscape/short-viewport checks, Playwright route sweeps.
- Risk: High because the shell touches all routes.
- Estimated effort: Medium

### MPR-025

- Category: Forms
- Route: Auth/Profile/Gather
- Affected files: `src/routes/auth.tsx`, `src/routes/setup-profile.tsx`, `src/routes/gather.new.tsx`, shared input/button primitives
- Root cause: Forms still behave like prototype forms with light validation and limited submit-state/error handling.
- Dependency: `MPR-012`.
- Implementation plan: Add production-like client validation where already local, disabled/loading states, inline errors, and double-submit guards without replacing stable Gather domain behavior.
- Validation method: Playwright form failure/retry tests, keyboard navigation checks, typecheck/lint/build.
- Risk: Medium.
- Estimated effort: Medium

### MPR-026

- Category: Observability Analytics
- Route: All
- Affected files: `src/lib/lovable-error-reporting.ts`, `src/routes/__root.tsx`, reports/docs
- Root cause: Only Lovable error reporting exists; there is no app-level telemetry plan for product flows, crashes, or privacy-sensitive auditing.
- Dependency: Backend/event pipeline decisions.
- Implementation plan: For Phase B, document a privacy-safe telemetry contract and add minimal local instrumentation hooks only where they improve user-visible error handling; defer real analytics pipeline work.
- Validation method: Report update, code references, no runtime regressions.
- Risk: Medium.
- Estimated effort: Medium

## Expected Local Outcomes

- Fix locally in Phase B:
  `MPR-011`, `MPR-012`, `MPR-013`, `MPR-014`, `MPR-015`, `MPR-016`, `MPR-019`, `MPR-020`, `MPR-023`, `MPR-024`, `MPR-025`
- Likely partial or deferred:
  `MPR-017`, `MPR-018`, `MPR-021`, `MPR-022`, `MPR-026`

## Validation Bundle

- Existing:
  `npx tsc --noEmit`, `npm run lint`, `npm run build`, `npm run test:gather`, `npm run test:gather:visual`, `npm run test:e2e`
- New expected Phase B validation:
  expanded mobile route Playwright suite, whole-app visual suite under `reports/mobile-review/visual/`, accessibility assertions, resilience tests, and `reports/mobile-review/performance-baseline.md`
