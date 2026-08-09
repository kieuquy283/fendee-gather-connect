# Mobile Review 13 - Performance

## Current Evidence

- Production build previously passed.
- No Lighthouse/Web Vitals measurement was found.
- No bundle budget was found.

## Risks

- The app imports many UI primitives and route/components are not clearly optimized for splitting beyond TanStack route boundaries.
- Remote avatar URLs are unsized third-party assets.
- Large files include `gather-store.tsx`, `gather-v2.tsx`, `widgets.tsx`, `home.tsx`, `nearby.index.tsx`, and `presence-store.tsx`.
- Radar animation and heavy rounded shadows should be profiled on low-end Android.
- Hydration warnings were documented in Gather QA and can mask layout/state instability.

## Targets

- LCP <= 2.5s.
- INP <= 200ms.
- CLS <= 0.1.

## Readiness

NOT MEASURED. Cannot claim production performance readiness until Web Vitals and mobile CPU/network profiles exist.

