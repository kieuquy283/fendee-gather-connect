# D2 Domain Map

Date: 2026-08-09

## Scope

D2 covers only these backend domains:

- user/account-visible profile data
- friend relationships and friend requests
- private friend groups
- privacy settings
- block state

Explicitly out of scope for D2:

- presence / nearby
- Gather persistence and invitations
- chat persistence
- notifications persistence/delivery
- report moderation workflow
- account deletion lifecycle

Those domains may consume D2 relationship or block primitives later, but they do not migrate to backend authority in this milestone.

## D1 Contract To Preserve

Verified actor identity already exists through the D1 session boundary:

request
-> verified session cookie
-> authenticated actor
-> protected server operation

D2 must preserve these invariants:

- actor identity comes from verified session only
- client `userId` can identify a target resource, never the caller
- client modules may only import shared contracts or server-function wrappers
- server repositories and authorization logic remain server-only

## Current D2 Bypass Inventory

### User / profile

Current bypasses:

- [src/routes/profile.index.tsx](/D:/KieuQuy/Documents/Fendee-demo/src/routes/profile.index.tsx) renders `me` directly from `src/lib/fendee-data.ts`
- [src/routes/profile.$id.tsx](/D:/KieuQuy/Documents/Fendee-demo/src/routes/profile.$id.tsx) loads `getPerson(params.id)` directly in the route loader
- [src/routes/setup-profile.tsx](/D:/KieuQuy/Documents/Fendee-demo/src/routes/setup-profile.tsx) uses static profile defaults and has no server mutation path
- [src/lib/authorization.ts](/D:/KieuQuy/Documents/Fendee-demo/src/lib/authorization.ts) makes profile decisions from frontend-loaded objects only

Required migration:

- server-backed current-user lookup
- server-backed profile lookup by target user id
- server-authoritative profile visibility filtering
- server-backed profile update for the authenticated actor only

### Friends / requests

Current bypasses:

- [src/routes/friends.index.tsx](/D:/KieuQuy/Documents/Fendee-demo/src/routes/friends.index.tsx) renders from static `people`
- [src/routes/friends.requests.tsx](/D:/KieuQuy/Documents/Fendee-demo/src/routes/friends.requests.tsx) mutates local `handled` state only
- [src/routes/add-friend.tsx](/D:/KieuQuy/Documents/Fendee-demo/src/routes/add-friend.tsx) shows suggestions from static `people`
- `friendRequests` lives in [src/lib/fendee-data.ts](/D:/KieuQuy/Documents/Fendee-demo/src/lib/fendee-data.ts) with no actor ownership or status transitions

Required migration:

- server-backed friend list
- server-backed incoming/outgoing requests
- request lifecycle mutations with object-level authorization
- server-filtered suggestions/add-friend targets

### Friend groups

Current bypasses:

- groups are not a standalone domain yet
- Gather currently embeds local `friendGroups` inside [src/lib/gather-store.tsx](/D:/KieuQuy/Documents/Fendee-demo/src/lib/gather-store.tsx)
- no group CRUD or membership enforcement path exists

Required migration:

- standalone group repository and server store
- owner-scoped group CRUD
- membership changes validated against friendship/block rules
- adapter surface for current Gather selectors without migrating Gather persistence

### Privacy / block

Current bypasses:

- [src/lib/privacy-store.tsx](/D:/KieuQuy/Documents/Fendee-demo/src/lib/privacy-store.tsx) persists block state and reports in `localStorage`
- [src/routes/settings.privacy.tsx](/D:/KieuQuy/Documents/Fendee-demo/src/routes/settings.privacy.tsx) uses local `useState`
- profile/block actions call local mutations only
- later domains consume `privacy.blockedUserIds` as a frontend filter, not an authoritative server primitive

Required migration:

- server-backed privacy settings read/write
- server-backed block/unblock/list
- server-enforced block checks for profile/friend/group behavior
- local cache becomes non-authoritative and user-scoped

## Current Interface Gaps

### Repository contracts

Current [src/lib/repositories.ts](/D:/KieuQuy/Documents/Fendee-demo/src/lib/repositories.ts) is insufficient for D2:

- `UserRepository` returns `Person`, which mixes public/profile/social fields
- `FriendRepository` does not distinguish incoming vs outgoing requests
- `GroupRepository` has no ownership-aware detail method or member validation result shape
- `PrivacyRepository` only models `visibility` plus blocked ids
- `ReportRepository` remains local, but D2 should not expand moderation beyond compatibility

Required contract direction:

- explicit profile DTOs for self/friend/public/blocked views
- request objects with ids, actor ownership, and status
- privacy settings DTO matching current product toggles or persisted subset
- reusable block relationship primitive for other domains

## Current Authorization Inputs

Existing useful vocabulary in [src/lib/authorization.ts](/D:/KieuQuy/Documents/Fendee-demo/src/lib/authorization.ts):

- `canViewProfile`
- `isBlocked`

Existing gaps:

- no durable friendship state input
- no foreign-owned group checks
- no request ownership checks
- no server-side DTO filtering boundary

Required D2 server policy helpers:

- `areFriends(actorId, targetId)`
- `isBlockedEitherDirection(actorId, targetId)`
- `canViewProfile(actorId, targetId)`
- `canEditOwnProfile(actorId, targetId)`
- `canRespondToFriendRequest(actorId, requestId)`
- `isGroupOwner(actorId, groupId)`
- `canAddGroupMember(actorId, groupId, memberId)`

## Server Storage Decision For D2

Per [02-backend-architecture-decision.md](/D:/KieuQuy/Documents/Fendee-demo/reports/backend/02-backend-architecture-decision.md), no production database vendor is selected.

D2 will therefore use:

- server-only repository implementations
- deterministic dev/test persistence
- no claim of production durability

Status language must stay precise:

- local server enforcement can become complete
- production durability can still remain blocked on a real database/shared store

## Migration Targets By File

Primary files expected to change:

- `src/lib/repositories.ts`
- `src/lib/authorization.ts`
- `src/lib/auth.tsx`
- `src/lib/privacy-store.tsx`
- `src/routes/profile.index.tsx`
- `src/routes/profile.$id.tsx`
- `src/routes/setup-profile.tsx`
- `src/routes/friends.index.tsx`
- `src/routes/friends.requests.tsx`
- `src/routes/add-friend.tsx`
- `src/routes/settings.privacy.tsx`

New D2 server-side files likely needed:

- server-only user/friend/group/privacy store and repository implementations
- shared D2 contracts / schemas
- client-safe server function wrappers for D2 operations
- D2 authorization helper module if the current shared module needs a server-safe split

## Test Surface

Existing test foundation to preserve:

- `tests/gather-v2/auth-session.spec.ts`
- Gather functional and visual suites
- full Playwright E2E suite
- client import-boundary build check

New D2 tests needed:

- multi-user profile visibility
- foreign profile edit denial
- friend request lifecycle and duplicates
- friend request ownership denial
- group ownership denial
- non-friend / blocked group member denial
- privacy ownership denial
- block/unblock enforcement across D2 routes and APIs
- reload persistence through the server adapter

## Dependency Order Inside D2

1. Shared D2 contracts and DTOs
2. Server-only in-memory/dev persistence for users, friendships, groups, privacy, and blocks
3. Server-side authorization helpers over verified actor + persisted state
4. Client-safe server function wrappers
5. Provider/route migration for profile, friends, groups, and privacy
6. Adversarial tests
7. Full regression and issue reconciliation

## Exit Condition For Code Changes

D2 implementation is ready to begin when:

- every D2 route/store that still trusts static or local state is identified
- verified actor usage is frozen
- the persistence limitation is explicitly documented as dev/test only
- the migration plan preserves current UX instead of redesigning screens
