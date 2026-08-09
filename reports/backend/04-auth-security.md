# D1 Auth Security

Date: 2026-08-09

## Architecture Before

browser
-> `AuthProvider`
-> browser-local auth state
-> `localStorage`
-> mock user identity
-> client route guard
-> protected routes

## Previous Trust Problems

The pre-D1 flow trusted:

- `localStorage` as the auth source of truth
- browser-created development identity
- optional client `userId` during sign-in
- route state as the effective auth boundary

## TanStack server/client import leak

Two client-reachable chains were present during the failing dev/browser run:

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

Observed runtime failure in dev/browser:

- protected screens stalled on `Checking session...`
- Playwright auth/session suite failed on expiry and logout scenarios
- Vite client runtime raised `AsyncLocalStorage` browser compatibility errors

## Module Classification

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

## Architecture After

browser
-> `AuthProvider`
-> `ServerAuthRepository`
-> server function/session endpoint boundary
-> HttpOnly opaque session cookie
-> server session lookup
-> verified actor identity

Protected request flow:

request
-> cookie/session credential
-> request auth context
-> verified session or typed auth failure

## D1 Boundary Changes

- split client and server runtime config
- moved session store/core logic into `src/lib/server-auth-core.ts`
- moved request middleware into `src/lib/auth-request-middleware.ts`
- kept cookie mutation helpers in `src/lib/server-auth.server.ts`
- removed `@tanstack/react-start/server` from client-imported auth wrapper
- changed logout to use the raw `/api/auth/sign-out` endpoint because that path reliably propagates revocation and `Set-Cookie` clearing in this runtime

## Security Guarantees Now Present

- caller identity no longer comes from body/query `userId`
- protected server operations can require a verified session
- missing, expired, revoked, and malformed sessions fail with typed auth errors
- logout revokes the active in-memory server session and clears the cookie
- direct protected-route entry and browser Back after logout return to signed-out UX
- development identity is limited to dev/test configuration

## Migration Map

Before:

- browser minted or restored trusted auth state locally

After:

- browser requests verified session state from the existing TanStack Start runtime
- server resolves actor identity from the session cookie
- frontend reacts to `authenticated | unauthenticated | expired | revoked | error`

## User-Scoped Local Keys

Keys still treated as user-scoped prototype state:

- `fendee-gather-state-v2`
- `fendee-presence-state`
- `fendee-privacy-state-v1`

Non-user application setting intentionally preserved:

- `fendee-theme`

## Validation Evidence

- `npm run typecheck`: PASS
- `npm run lint`: PASS with 19 existing Fast Refresh warnings only
- `npm run build`: PASS
- `npm run test:auth-boundary`: PASS (`71` client assets checked)
- `npx playwright test auth-session.spec.ts`: PASS (`21/21`)

## Remaining Limitations

- no production identity provider is configured yet
- session storage is still in-memory only
- object-level server authorization is still pending by domain
- account deletion remains a placeholder backend request
