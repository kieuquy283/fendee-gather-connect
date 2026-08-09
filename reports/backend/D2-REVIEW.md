# D2 Review

Date: 2026-08-09

## Executive Summary

D2 is complete for local backend enforcement of User/Profile, Friends/Groups, Privacy, and Block behavior.

The frontend still uses the established provider/store UX, but those domains no longer mutate authoritative state directly in local component state or `localStorage`. They now resolve through verified-session server repositories and typed server function boundaries.

Persistence remains **DEV/TEST ONLY**. D2 uses a session-scoped in-memory server social store to support deterministic local testing and to prevent cross-project state bleed during parallel Playwright runs. Production durability is still blocked on a real database/shared store.

## Architecture Before

Before D2:

- profile routes read directly from static mock data
- friend lists and requests were local/static
- friend groups lived inside the Gather store
- privacy settings and block state were local-only
- object ownership and relationship rules were frontend-only

## Architecture After

Request flow for D2 domains:

UI
-> provider/store
-> client-safe server function wrapper
-> verified session actor
-> server authorization helper
-> server repository
-> server-only dev/test persistence adapter

Primary implementation files:

- [src/lib/social-contracts.ts](/D:/KieuQuy/Documents/Fendee-demo/src/lib/social-contracts.ts)
- [src/lib/social.functions.ts](/D:/KieuQuy/Documents/Fendee-demo/src/lib/social.functions.ts)
- [src/lib/social-graph.tsx](/D:/KieuQuy/Documents/Fendee-demo/src/lib/social-graph.tsx)
- [src/lib/privacy-store.tsx](/D:/KieuQuy/Documents/Fendee-demo/src/lib/privacy-store.tsx)
- [src/lib/social-store.server.ts](/D:/KieuQuy/Documents/Fendee-demo/src/lib/social-store.server.ts)
- [src/lib/social-authorization.server.ts](/D:/KieuQuy/Documents/Fendee-demo/src/lib/social-authorization.server.ts)
- [src/lib/social-repositories.server.ts](/D:/KieuQuy/Documents/Fendee-demo/src/lib/social-repositories.server.ts)
- [src/lib/social-api.server.ts](/D:/KieuQuy/Documents/Fendee-demo/src/lib/social-api.server.ts)

## Repository Implementations

Implemented server-backed operations:

- current profile read/update
- other-user profile read with visibility filtering
- friends list / incoming requests / outgoing requests / suggestions
- send / accept / decline / cancel / remove friendship
- create / rename / delete group
- add / remove group member
- privacy settings read/update
- block / unblock / list blocked users
- report submission compatibility

## Authorization Rules

Authoritative server checks now exist for D2 operations:

- caller identity derives from verified session only
- target user ids are treated as resource identifiers, never actor proof
- only the authenticated actor may update their own profile or privacy settings
- friend request acceptance/decline/cancel requires request ownership
- group mutation requires group ownership
- group membership requires accepted friendship and no blocked relationship
- profile visibility is resolved server-side using privacy + friendship + block state

## Block Semantics

D2 block side effects are explicit:

- block record stored server-side in the dev/test adapter
- accepted friendship removed
- pending requests cancelled either direction
- blocked target removed from blocker-owned groups
- profile/friend/group reads and mutations deny blocked relationships

This primitive is ready for reuse in D3+ domains, but those later domains have not yet been fully migrated.

## Persistence Behavior

Current persistence mode: **DEV/TEST ONLY**

Behavior:

- D2 state survives reload within the active verified session
- D2 state is isolated per verified session in dev/test
- logout + relogin does not reuse the previous user's D2 state as authoritative client state

Missing for production:

- durable database
- shared multi-instance store
- migration strategy beyond dev/test memory

## Client/Server Boundary Verification

D1 boundary protections were preserved.

Evidence:

- `npm run test:auth-boundary` -> `Client boundary check passed for 71 client assets`
- client build no longer executes server-only auth/D2 modules in the browser graph
- D2 implementation remains behind server functions and server-only modules

## Multi-User Security Tests

D1 auth/session suite:

- `npx playwright test tests/gather-v2/auth-session.spec.ts` -> `21/21 passed`

D2 adversarial suite:

- `npm run test:d2` -> `17/17 passed`

Full mobile/frontend regression:

- `npm run test:e2e -- --reporter=dot` -> `141/141 passed`

## Regression Note

During D2 closeout, full E2E initially exposed a real regression:

- the new in-memory D2 social store was global
- parallel Playwright projects reset each other's block/friend state

Fix:

- D2 server social state is now bucketed by verified session id in dev/test
- [tests/gather-v2/helpers.ts](/D:/KieuQuy/Documents/Fendee-demo/tests/gather-v2/helpers.ts) now resets D2 server state wherever the legacy suite previously assumed local-only social state

Result:

- blocked-profile / blocked-chat security flow remains stable in the full parallel E2E run

## Exact Validation Results

- `npm run typecheck` -> `PASS`
- `npm run lint` -> `PASS` with `20` existing Fast Refresh warnings only
- `npm run build` -> `PASS`
- `npm run test:auth-boundary` -> `PASS`
- `npx playwright test tests/gather-v2/auth-session.spec.ts` -> `21/21 passed`
- `npm run test:d2` -> `17/17 passed`
- `npm run test:gather -- --reporter=dot` -> `21/21 passed`
- `npm run test:gather:visual -- --reporter=dot` -> `12/12 passed`
- `npm run test:e2e -- --reporter=dot` -> `141/141 passed`

## Remaining Limitations

- D2 persistence is not production durable
- production identity provider is still not integrated
- session storage is still in-memory from D1
- report submission is stored server-side only in the dev/test adapter and has no moderation workflow
- Presence, Nearby, Gather persistence, Chat, Notifications, and account lifecycle remain for later milestones

## D2 Status

`USER/FRIENDS/PRIVACY BACKEND READY`

For local enforcement only.

Production durability remains blocked pending:

- production database / shared store
- later domain migrations that consume block/friend primitives
