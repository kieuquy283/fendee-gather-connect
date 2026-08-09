# D1 Auth Review

Date: August 9, 2026

## Executive Summary

D1 is now locally ready as an auth/session foundation.

The final blocker was a TanStack Start server/client boundary leak in dev mode. It pulled `@tanstack/start-server-core` into the browser graph, triggered `node:async_hooks.AsyncLocalStorage` errors, and left protected screens stuck on `Checking session...`. That leak is removed, the verified session flow now settles deterministically, logout revokes the active session, and browser Back after logout no longer restores authenticated behavior.

## Architecture Before

- browser-trusted auth state
- `localStorage` as the effective session source
- no verified server session boundary
- route guards acting as the main protection

## Architecture After

- explicit shared auth/session contracts
- verified server session lookup behind the TanStack Start runtime
- request auth context for protected server work
- `AuthProvider` driven by verified session status
- local dev/test identity isolated from production-like configuration

## Root Cause Of AsyncLocalStorage Leak

Proven client-reachable import chains:

1. `src/lib/auth.tsx`
   -> `src/lib/auth.functions.ts`
   -> `@tanstack/react-start/server`
   -> `@tanstack/start-server-core/dist/esm/request-response.js`
   -> `node:async_hooks`

2. `src/routeTree.gen.ts`
   -> `import type { startInstance } from "./start.ts"`
   -> `src/start.ts`
   -> `src/lib/server-auth.server.ts`
   -> `@tanstack/start-server-core`
   -> `node:async_hooks`

Fix:

- removed `@tanstack/react-start/server` from the client-imported auth wrapper
- split request middleware away from cookie helper code
- moved start-time auth context wiring onto a server-only core path that no longer drags `start-server-core` through `start.ts`

## Server/Client Module Classification

- `src/lib/auth-contracts.ts`: `SHARED`
- `src/lib/api-errors.ts`: `SHARED`
- `src/lib/runtime-config.ts`: `CLIENT_SAFE`
- `src/lib/runtime-config.server.ts`: `SERVER_ONLY`
- `src/lib/auth.tsx`: `CLIENT_SAFE`
- `src/lib/auth.functions.ts`: `SERVER_FUNCTION_WRAPPER`
- `src/lib/server-auth-core.ts`: `SERVER_ONLY`
- `src/lib/auth-request-middleware.ts`: `SERVER_ONLY`
- `src/lib/server-auth.server.ts`: `SERVER_ONLY`
- `src/start.ts`: `SERVER_ENTRY`
- `src/server.ts`: `SERVER_ENTRY`

## New Contracts And Files

- `src/lib/auth-contracts.ts`
- `src/lib/api-errors.ts`
- `src/lib/runtime-config.ts`
- `src/lib/runtime-config.server.ts`
- `src/lib/auth.functions.ts`
- `src/lib/server-auth-core.ts`
- `src/lib/auth-request-middleware.ts`
- `src/lib/server-auth.server.ts`

## Session State Machine

Frontend session state is explicit:

- `loading`
- `authenticated`
- `unauthenticated`
- `expired`
- `revoked`
- `error`

Observed transitions now working:

- boot -> checking session -> authenticated
- boot -> checking session -> unauthenticated
- authenticated -> expired after server-side expiry
- authenticated -> unauthenticated after logout

## Logout And Expiry Behavior

- session expiry while the app is open now transitions the provider out of authenticated state without restart
- logout now revokes the active server session and clears the cookie
- browser Back after logout returns to signed-out/guarded UX instead of restoring usable private content

Note:

- read/sign-in still use server functions
- logout uses the raw `/api/auth/sign-out` endpoint because that path reliably propagates revocation and cookie clearing in this runtime

## Files Changed In Final Repair

- `src/lib/auth.tsx`
- `src/lib/auth.functions.ts`
- `src/lib/runtime-config.ts`
- `src/lib/runtime-config.server.ts`
- `src/lib/server-auth-core.ts`
- `src/lib/auth-request-middleware.ts`
- `src/lib/server-auth.server.ts`
- `src/start.ts`
- `src/server.ts`
- `tests/gather-v2/helpers.ts`
- `scripts/check-client-boundary.mjs`
- `package.json`

## Client Bundle Verification

Build-artifact verification:

- `npm run build`: PASS
- `npm run test:auth-boundary`: PASS
- result: `71` client `.js` assets scanned under `.output/public`
- forbidden strings not present:
  - `@tanstack/start-server-core`
  - `node:async_hooks`
  - `AsyncLocalStorage`
  - `server-auth.server`

## Test Evidence

- `npx playwright test auth-session.spec.ts`: PASS (`21/21`)
- `npm run typecheck`: PASS
- `npm run lint`: PASS with 19 existing Fast Refresh warnings only
- `npm run build`: PASS
- `npm run test:gather`: PASS (`21/21`)
- `npm run test:gather:visual`: PASS (`12/12`)
- `npm run test:e2e`: PASS (`141/141`)

## Security Guarantees Now Present

- client-supplied `userId` cannot establish actor identity
- protected server work can require verified session state centrally
- malformed, missing, expired, and revoked sessions fail predictably
- dev identity bypass is isolated to dev/test configuration
- frontend auth state no longer remains fake-authenticated after expiry/logout

## Remaining Limitations

- no production identity provider yet
- no durable shared session store yet
- object-level backend authorization is still pending
- account deletion is still a placeholder backend request

## D1 Status

`AUTH BACKEND FOUNDATION READY`

## Next Milestone

`D2 — User/Profile + Friends/Groups + Privacy/Block server persistence and authorization`
