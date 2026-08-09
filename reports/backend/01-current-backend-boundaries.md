# Current Backend Boundaries

Date: 2026-08-09

## Executive Summary

The repository is still frontend-first. It has useful adapter seams and domain concepts, but not a production backend implementation:

- reusable repository interfaces exist in `src/lib/repositories.ts`;
- auth, privacy, presence, and Gather each have self-contained local adapters or stores;
- UI route protection exists through `RequireAuth`;
- authorization rules are modeled in `src/lib/authorization.ts`;
- there is no API client layer, no database schema, no migrations, and no server mutation endpoints;
- the only server code present is TanStack Start / Nitro SSR wiring in `src/server.ts` and `src/start.ts`.

## Existing Production-Relevant Boundaries

### SSR / server runtime

- `src/server.ts`
  - wraps TanStack Start server entry
  - normalizes catastrophic SSR failures
- `src/start.ts`
  - installs request error middleware
  - installs CSRF middleware for TanStack server functions

Assessment:

- Suitable for hosting a future authenticated API boundary if the app stays on TanStack Start / Nitro.
- Not currently used as a domain backend.

### Repository contracts

- `src/lib/repositories.ts`

Defined interfaces:

- `UserRepository`
- `FriendRepository`
- `GroupRepository`
- `PresenceRepository`
- `GatherRepository`
- `ChatRepository`
- `NotificationRepository`
- `PrivacyRepository`
- `ReportRepository`
- `AuthRepository` is defined separately in `src/lib/auth.tsx`

Assessment:

- Good starting seam for server adapters.
- Incomplete for production. Missing contracts for:
  - session refresh/revoke details
  - friend requests and group mutations
  - profile update/privacy settings
  - Gather detail/update/host/invite/RSVP/end flows
  - message list/pagination/read state
  - push device registration
  - account deletion/export
  - audit/moderation admin flows

## Domain Audit

### AuthRepository

File:

- `src/lib/auth.tsx`

Current implementation:

- `DevelopmentAuthRepository`
- session stored in `localStorage`
- `signIn()` accepts optional `userId` and creates a local dev session
- `requestAccountDeletion()` only returns `pending_backend`

Strengths:

- `AuthProvider` already centralizes session loading and signed-in/signed-out/expired UX.
- The frontend API surface is stable enough to preserve.

Gaps:

- No verified identity
- No session refresh token or revocation model
- No backend logout
- No production sign-up/session bootstrap path

Adapter readiness:

- Good. Preserve `AuthProvider` shape and replace repository implementation.

### UserRepository

Files:

- interface only in `src/lib/repositories.ts`
- mock data in `src/lib/fendee-data.ts`

Current state:

- No actual repository implementation
- routes read mock profile data directly

Adapter readiness:

- Partial. The interface is useful, but routes need to stop reading static source data directly for production.

### FriendRepository

Files:

- interface only in `src/lib/repositories.ts`
- mock friend graph in `src/lib/fendee-data.ts`

Current state:

- No durable friend request / accept / decline / remove flow
- `Person.isFriend` is static source state

Adapter readiness:

- Weak. Needs real mutation/query contract before server adapter work.

### GroupRepository

Files:

- interface only in `src/lib/repositories.ts`
- local constants in `src/lib/gather-store.tsx`

Current state:

- Friend groups are embedded in Gather store as `friendGroups`
- No create/rename/delete/add/remove member contract

Adapter readiness:

- Weak. Needs extraction into a standalone domain adapter.

### PresenceRepository

Files:

- interface in `src/lib/repositories.ts`
- implementation logic embedded in `src/lib/presence-store.tsx`

Current state:

- start/stop/publish/unpublish concepts already exist
- device state, friend snapshot, nearby publication, and permission state are modeled
- no server communication

Strengths:

- The domain split between Nearby stranger visibility and friend snapshot is already correct.
- Presence state machine is more mature than other domains.

Gaps:

- No geolocation provider abstraction yet
- No heartbeat/TTL
- No authoritative server state
- No privacy-safe nearby query contract

Adapter readiness:

- Good for server-backed domain methods, but needs a separate `LocationProvider`.

### GatherRepository

Files:

- interface in `src/lib/repositories.ts`
- full local implementation in `src/lib/gather-store.tsx`

Current state:

- rich local domain model:
  - owner
  - co-host
  - invitee
  - audience resolution
  - RSVP
  - expiry
  - notifications
- persistence is `localStorage`

Strengths:

- Best current backend candidate.
- Domain concepts are explicit and should be preserved.

Gaps:

- Interface is far too small for real backend integration
- audience resolution currently trusts local friend/group data
- notifications are side effects inside the store, not server events

Adapter readiness:

- Good domain model, incomplete repository contract.

### ChatRepository

Files:

- interface in `src/lib/repositories.ts`
- mock data in `src/lib/fendee-data.ts`

Current state:

- only `canOpenConversation()` and `sendMessage()` are represented
- conversations and messages are static source data

Adapter readiness:

- Weak. Needs conversation list/detail/pagination/read-state contracts.

### NotificationRepository

Files:

- interface in `src/lib/repositories.ts`
- notifications generated in `src/lib/gather-store.tsx`
- static notices in `src/lib/fendee-data.ts`

Current state:

- read/delivery state is not durable
- domain ownership is split between Gather store and route rendering

Adapter readiness:

- Weak. Needs a dedicated server event and recipient model.

### PrivacyRepository

Files:

- interface in `src/lib/repositories.ts`
- local implementation logic in `src/lib/privacy-store.tsx`

Current state:

- block list is local
- block/report side effects do not propagate authoritatively to other domains

Adapter readiness:

- Partial. The concept is correct but the interface is too narrow for privacy settings and account-level controls.

### ReportRepository

Files:

- interface in `src/lib/repositories.ts`
- local report creation in `src/lib/privacy-store.tsx`

Current state:

- reports are local and marked `pending_backend`

Adapter readiness:

- Partial for end-user report creation; missing moderation/admin contract.

## Authorization Policy Boundary

File:

- `src/lib/authorization.ts`

Current strengths:

- central policy functions exist for:
  - profile view
  - messaging
  - conversation view
  - Gather view/manage/edit/invite/RSVP
  - presence visibility
  - friend snapshot visibility
  - nearby publication
  - notification ownership
  - report submission

Current limits:

- policy inputs depend on frontend-loaded objects
- no server resource loader uses these rules
- some rules currently assume static friend/public visibility rather than durable relationships

Assessment:

- Preserve the policy vocabulary, but re-implement enforcement on the server with persisted records.

## Route Guard Boundary

Files:

- `src/lib/auth.tsx`
- `src/components/fendee/AppShell.tsx`

Current state:

- `RequireAuth` protects routes in the shell
- signed-out / expired UX is correct for frontend behavior

Assessment:

- Keep for UX only.
- Not a security boundary.

## Persistence Boundary

Files:

- `src/lib/prototype-storage.ts`
- `src/lib/auth.tsx`
- `src/lib/privacy-store.tsx`
- `src/lib/presence-store.tsx`
- `src/lib/gather-store.tsx`
- `src/lib/theme.ts`

Current state:

- Auth, Gather, presence, privacy, and prototype runtime configuration all use `localStorage`
- sign-out clears sensitive prototype keys locally

Assessment:

- Useful for development adapters and deterministic tests.
- Not suitable for production security or privacy controls.

## Development Adapter Boundary

Files:

- `src/lib/auth.tsx`
- `src/lib/prototype-runtime.ts`
- `src/lib/fendee-data.ts`
- `src/lib/presence-store.tsx`
- `src/lib/gather-store.tsx`
- Playwright helper seeding under `tests/gather-v2/`

Current state:

- The repo has a strong local-simulation pattern already.
- Tests seed browser state directly for deterministic scenarios.

Assessment:

- Preserve this boundary.
- Production adapters should sit behind the same domain interfaces.
- Development adapters must remain available for local QA and isolated frontend tests.

## Interface Suitability Summary

| Area | Keep boundary | Expand boundary | Replace direct source reads |
|---|---|---|---|
| Auth | Yes | Yes | No direct session trust in UI |
| User/Profile | Partial | Yes | Yes |
| Friends | Partial | Yes | Yes |
| Groups | Partial | Yes | Yes |
| Privacy/Block | Yes | Yes | Yes |
| Presence | Yes | Yes | Yes |
| Gather | Yes | Yes | Yes |
| Chat | Partial | Yes | Yes |
| Notifications | Partial | Yes | Yes |
| Reports | Partial | Yes | Yes |

## Immediate Interface Adjustments Recommended

Before production adapter implementation, extend repository contracts for:

1. Auth
   - session bootstrap
   - refresh
   - revoke all sessions
2. Friends / groups
   - friend request lifecycle
   - group CRUD and membership management
3. Presence
   - heartbeat
   - nearby query
   - explicit friend snapshot update
4. Gather
   - detail
   - update
   - co-host response
   - audience resolution
   - invite more
   - RSVP
   - end / expire
5. Chat
   - conversation list/detail
   - message pagination
   - read markers
6. Notifications
   - actor-scoped list
   - mark read
   - push device registration
7. Privacy / account lifecycle
   - privacy settings
   - account deletion request
   - export request

## Conclusion

The frontend domain architecture does not need a rewrite. The correct direction is:

- keep the current providers and policy vocabulary where practical;
- move persistence and authority behind production repositories;
- add missing contracts where the current interfaces are too small; and
- preserve local adapters for development and deterministic test modes.
