# Mobile Review 00 - Project Baseline

## Scope Reviewed

Reviewed repository structure, `package.json`, lockfiles, `src/`, `public/`, route files, Fendee components, stores, hooks/lib files, styles, tests, reports, README, TypeScript config, ESLint config, Vite/TanStack config, screenshots, and existing QA reports.

## Stack

- React 19, TanStack Router/Start, Vite 8, Tailwind CSS 4, Radix UI, lucide-react.
- Client state is React Context plus local component state.
- Prototype data is static TypeScript data in `src/lib/fendee-data.ts` and `src/lib/fendee-presence.ts`.
- Gather V2 uses a centralized store in `src/lib/gather-store.tsx`.
- Presence uses a centralized store in `src/lib/presence-store.tsx`.
- Playwright exists for focused Gather V2 mobile functional and visual QA.

## Scripts

- `npm run dev`
- `npm run build`
- `npm run build:dev`
- `npm run preview`
- `npm run lint`
- `npm run format`
- `npm run test:e2e`
- `npm run test:gather`
- `npm run test:gather:visual`

## Existing Evidence

- `reports/gather-v2-final-qa.md` records passing typecheck, lint, build, Gather functional tests, and Gather visual tests at 360, 390, and 430 px.
- `reports/presence-final-qa.md` records build/lint and manual/prototype flow coverage for presence.
- `reports/gather-v2-visual/` contains mobile screenshots for Gather states.

## Baseline Risks

- The product is still a frontend prototype. Authentication, authorization, backend persistence, push notification delivery, network failure handling, and server-side privacy controls are not implemented.
- Both `package-lock.json` and `bun.lock` exist. Current scripts use npm, so the Bun lockfile is a drift risk.
- `npm ls --depth=0` reports extraneous packages in `node_modules`.
- Route guards are absent. No `beforeLoad` auth/authorization checks were found in routes.

