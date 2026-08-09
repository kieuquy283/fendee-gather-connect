# Production Remediation Phase C Assessment

Date: 2026-08-09

## Inputs Read

- `reports/mobile-review/FINAL-MOBILE-REVIEW.md`
- `reports/mobile-review/issues.csv`
- `reports/mobile-review/PHASE-A-REVIEW.md`
- `reports/mobile-review/remediation-phase-b.md`
- category reports under `reports/mobile-review/`
- current mobile screenshots under `reports/mobile-review/visual/`
- shared visual system files including `src/styles.css`, `src/components/fendee/AppShell.tsx`, `src/components/fendee/ui.tsx`, `src/components/fendee/cards.tsx`, `src/components/fendee/presence.tsx`, `src/components/fendee/sheets.tsx`, `src/components/fendee/gather-v2.tsx`
- primary route surfaces including `home`, `nearby`, `chat`, `profile`, `friends`, and `notifications`

Note: `reports/mobile-review/PHASE-B-REVIEW.md` does not exist in the repository. Phase B state was inferred from `reports/mobile-review/remediation-phase-b.md`, current issue statuses, current screenshots, and current application code.

## Open P3 Findings

### MPR-027 - Code Quality

- Status: `Open`
- Scope: oversized mixed-responsibility files, especially Gather and shared social UI
- Local Phase C action: split only where it materially improves maintainability without destabilizing domain behavior

### MPR-028 - Linting

- Status: `Open`
- Scope: unused variable rule disabled in `eslint.config.js`
- Local Phase C action: enable the rule with a practical underscore escape and clean resulting dead code

### MPR-029 - Type Safety

- Status: `Open`
- Scope: Playwright tests not covered by TypeScript checking
- Local Phase C action: add test typecheck coverage if it can be done without disrupting current scripts

### MPR-030 - Persistence Schema

- Status: `Open`
- Scope: no general persisted schema versioning
- Local Phase C action: only address if a concrete locally-fixable defect is found during current flow QA; avoid speculative architecture changes

### MPR-031 - Assets Privacy

- Status: `Open`
- Scope: third-party avatar host
- Local Phase C action: replace with local or owned app assets where practical

### MPR-032 - Robots/Indexing

- Status: `Open`
- Scope: robots currently allow crawling app routes
- Local Phase C action: tighten robots/noindex posture for prototype/private surfaces

### MPR-033 - Notifications

- Status: `Open`
- Scope: read/unread and action completion are not durable
- Local Phase C action: improve local UX clarity only; do not claim backend durability

### MPR-034 - Time Behavior

- Status: `Open`
- Scope: static relative labels and stale expiry copy
- Local Phase C action: normalize local display formatting where feasible without inventing fake backend timestamps

### MPR-035 - Error Handling

- Status: `Open`
- Scope: generic route/domain errors
- Local Phase C action: normalize route-level empty/error/retry copy and shared state treatment

### MPR-036 - Design Tokens

- Status: `Open`
- Scope: token usage and contrast not formally verified
- Local Phase C action: normalize magic values, strengthen token usage, and document motion/copy guidance

## Open P4 Findings

### MPR-037 - Fast Refresh

- Status: `Open`
- Scope: dev-only Fast Refresh warnings
- Local Phase C action: resolve easy cases while doing cleanup, defer any non-trivial structural churn

### MPR-038 - Documentation

- Status: `Open`
- Scope: scaffold wording and outdated handoff docs
- Local Phase C action: refresh README and review docs to reflect current Fendee state

### MPR-039 - Repository Hygiene

- Status: `Open`
- Scope: temporary log files in repo root
- Local Phase C action: remove or ignore local runtime noise

### MPR-040 - Navigation Polish

- Status: `Open`
- Scope: bottom nav density and center action crowding on narrow screens
- Local Phase C action: normalize label density, spacing, and tap behavior across 320-430 widths

## Additional Phase C Issues Observed During Assessment

These are locally actionable and should be tracked in Phase C even if they were not explicitly listed before.

### New: Widespread mojibake in visible Vietnamese copy

- Evidence: multiple route and shared-component files render broken text such as `Tin nháº¯n`, `Há»“ sÆ¡`, `Rá»§ gáº·p`
- Impact: obvious product-quality regression, readability loss, and broken release-candidate presentation
- Proposed severity: `P2 HIGH`

### New: Mixed English/Vietnamese user-facing copy on primary screens

- Evidence: `Home`, `Nearby`, `Profile`, `Chat`, `Presence` sheets, and notification/session labels mix English titles with Vietnamese body copy
- Impact: product inconsistency and reduced trust
- Proposed severity: `P3 MEDIUM`

### New: Prototype-only control copy is still exposed on primary screens

- Evidence: buttons such as `Simulate moving`, `GPS inaccurate`, `Stable Area B`, `Presence Expired`, `Reset permission prompt`
- Impact: release-candidate quality blocked even when behavior remains local/mock
- Proposed severity: `P3 MEDIUM`

### New: Shared component sizing and language are not normalized

- Evidence: top bars, chips, empty states, sheets, and button labels alternate between English and Vietnamese and use inconsistent text sizes
- Impact: app does not yet read as one coherent mobile product
- Proposed severity: `P3 MEDIUM`

## Current Product-Wide Inconsistencies

- Typography hierarchy is inconsistent. Several screens still use `10px` and `11px` text for important content.
- Copy is inconsistent across routes, especially around Presence, Chat, Profile, and Notifications.
- The bottom navigation remains too dense for narrow widths and uses English labels inconsistent with the rest of the app.
- Home and Nearby still expose QA/prototype interactions directly in the main viewport.
- Cards and sheets share the same general language, but spacing and action prominence vary noticeably.
- Primary route states are not normalized yet. Empty/error/success/loading treatments differ by feature.
- The app shell, top bars, and route headers use slightly different horizontal offsets and safe-area treatments.
- There are still visible arbitrary values and per-screen sizing choices that should collapse into shared tokens.

## Phase C Execution Order

1. Normalize tokens, shell spacing, top bars, buttons, inputs, cards, sheets, and shared state surfaces.
2. Fix visible text encoding problems and complete Vietnamese copy normalization.
3. Remove or quarantine prototype-only controls from primary product views while keeping required local behavior for QA.
4. Polish primary routes for consistent loading, empty, error, success, and blocked states.
5. Rework bottom navigation density and one-hand touch targets for 320-430 widths.
6. Improve accessibility polish, target sizing, focus visibility, and reduced-motion handling where missing.
7. Replace third-party avatar dependencies with local/privacy-safe assets if feasible.
8. Clean up maintainability issues, repo noise, lint/test coverage, and documentation.
9. Refresh screenshots, visual regression outputs, contact sheet, issue tracker, and final review docs.

## Non-Goals

- Do not mark `REQUIRES BACKEND` issues as fixed through frontend-only simulation.
- Do not rewrite stable Gather or Presence domain architecture without a concrete defect.
- Do not invent production persistence, moderation, notification delivery, or geolocation guarantees that do not exist locally.
