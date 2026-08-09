# D4 Gather Map

Date: 2026-08-09

## Purpose

This document records the Gather V2 architecture before the D4 backend migration.

It captures:

- current Gather authority
- current Gather route and component flow
- current role and permission behavior
- current audience resolution behavior
- current persistence behavior
- D1/D2/D3 primitives available for reuse

## Current Authority Before D4

Gather is still client-authoritative.

Current flow:

UI routes/components
-> `GatherProvider` in `src/lib/gather-store.tsx`
-> local React state
-> `localStorage` key `fendee-gather-state-v2`

Gather does not yet have:

- shared Gather contracts
- server functions
- server-only repositories
- server-only persistence adapter
- authenticated server authorization for Gather roles/actions

## Current Files Read

Core:

- `src/lib/gather-store.tsx`
- `src/lib/authorization.ts`
- `src/lib/repositories.ts`
- `src/components/fendee/gather-v2.tsx`

Routes:

- `src/routes/gather.index.tsx`
- `src/routes/gather.new.tsx`
- `src/routes/gather.$id.tsx`
- `src/routes/gather.$id_.manage.tsx`
- `src/routes/notifications.tsx`

Reference backend patterns:

- `reports/backend/D1-AUTH-REVIEW.md`
- `reports/backend/D2-REVIEW.md`
- `reports/backend/D3-REVIEW.md`
- `src/lib/social.functions.ts`
- `src/lib/social-repositories.server.ts`
- `src/lib/presence.functions.ts`
- `src/lib/presence-repositories.server.ts`

Tests:

- `tests/gather-v2/gather-functional.spec.ts`
- `tests/gather-v2/gather-visual.spec.ts`
- `tests/gather-v2/helpers.ts`

## Current Domain Models In Code

Current client-defined types in `src/lib/gather-store.tsx`:

- `Gather`
- `GatherHost`
- `GatherInvite`
- `GatherAudienceSelection`
- `GatherAudienceSnapshot`
- `GatherNotification`
- `CreateGatherInput`
- `GatherPermission`

Current role/status modeling:

- owner role
- co-host role with `pending | accepted | declined`
- invitee state through `GatherInvite`
- Gather status `live | expired | ended`

This is already close to the target product model and should be preserved at the shared contract layer.

## Current Persistence

Current persistence key:

- `fendee-gather-state-v2`

Behavior:

- initial state is seeded from `seedGathers()`
- state is read from `localStorage` in `readStoredState()`
- state is rewritten to `localStorage` after hydration when authenticated
- reload reconstructs Gather state only from client storage

Current gaps:

- no authoritative server state
- no test-world server isolation
- no verified-session ownership boundary
- no server-time authority for expiry

## Current Route Behavior

### `/gather`

Uses:

- `store.gathers`
- client-side `canViewGather()`
- local auth state
- local blocked ids from `usePrivacy()`

Filtering behavior:

- live tab shows all live Gather records the client decides are visible
- mine tab is derived client-side from owner/co-host membership
- expired tab is derived client-side from `gather.status`

### `/gather/new`

Uses:

- `store.resolveAudience()`
- `store.createGather()`

Behavior:

- step wizard remains fully client-driven
- preview audience counts are derived locally
- publish writes directly into local store

### `/gather/$id`

Uses:

- `store.getGather(id)`
- `store.respondToCohostInvite()`
- `store.updateRSVP()`
- `store.can()`
- client-side `canViewGather()`

Behavior:

- no server authorization protects reads
- no server ownership check protects co-host response or RSVP mutation
- current actor identity is derived from the client auth provider

### `/gather/$id/manage`

Uses:

- `store.getGather(id)`
- `store.can()`
- `store.endGather()`
- client-side `canManageGather()`

Behavior:

- manage access is frontend-only
- owner-only actions are enforced only by local permission checks

## Current Role / Permission Behavior

Current permission logic is in `src/lib/authorization.ts`.

Behavior today:

- owner can manage all Gather permissions
- accepted co-host can edit content/note/image/place/expiry and view RSVP
- accepted co-host cannot do owner-only actions
- pending co-host is visible and can view the Gather, but does not gain manage permission
- invitee can update RSVP when invited and Gather is live

Important limitation:

- all of these are still client-side checks against client-local Gather data

## Current Audience Resolution

Current audience resolution happens locally in `resolveAudienceSelection()`.

Inputs:

- include all friends
- selected groups
- selected friends

Resolution behavior:

- uses `useSocialGraph()` friend/group data already hydrated from D2
- uses `usePrivacy().blockedUserIds`
- deduplicates recipients
- removes owner
- excludes invalid/non-friend targets based on local friend flags

Current gaps:

- client performs final audience resolution
- client can effectively decide recipient ids
- no server-owned immutable invite snapshot
- no server enforcement of group membership at publish time

## Current Co-Host Flow

Current co-host flow is client-only:

- publish immediately writes co-host entries with status `pending`
- target user can accept or decline through `respondToCohostInvite()`
- accepted status unlocks manage permissions locally

This behavior matches the intended product flow and should be preserved behind the server boundary.

## Current RSVP Flow

Current RSVP flow is client-only:

- `updateRSVP()` mutates invite status in local state
- only the current actor id is effectively applied, even if another person id is passed
- notifications are also generated locally

Current statuses used:

- `sent`
- `seen`
- `going`
- `maybe`
- `declined`

Withdraw currently maps back to `seen`.

## Current Expiry Behavior

Current expiry is client-time driven:

- `markExpired()` runs on an interval in the provider
- Gather becomes `expired` when `expiresAtMs <= Date.now()`
- inactive Gather disables RSVP in the UI

Current gaps:

- server time is not authoritative
- no server rejection of expired mutations
- reload may depend on whatever was last persisted locally

## Current Notifications Coupling

Gather currently owns a local `notifications` array and creates notification rows for:

- co-host invite
- co-host accepted/declined
- Gather invite
- RSVP updates
- Gather ended

This is not yet a Notification backend.

For D4, Gather state migration should preserve current notification-facing data where the UI depends on it, without starting a separate Notifications backend migration.

## D1 / D2 / D3 Primitives Ready For Reuse

### D1

Available:

- verified session actor
- request bucket id / test-world isolation boundary
- server function boundary

### D2

Available:

- friendship checks
- group ownership/membership records
- block checks in either direction
- privacy settings

These are the correct authority inputs for Gather audience resolution and visibility enforcement.

### D3

Available:

- server-backed dev/test store pattern
- bucketed test-world persistence
- hydration-first client migration pattern
- server-authoritative reload reconstruction

These patterns should be mirrored for Gather.

## Current Test Assumptions

Existing Gather tests currently assume:

- Gather seed state can be placed directly in `localStorage`
- Gather mutations are immediately visible through `localStorage`
- reload reconstruction reads persisted Gather state
- co-host and RSVP actions update the authoritative state without page reload

D4 will need to preserve these user-visible behaviors while moving authority to the server.

## Main Migration Targets Derived From This Map

D4 needs to:

- move Gather authority behind authenticated server repositories
- keep OWNER / CO-HOST / INVITEE roles separate
- make audience resolution server-side using D2 friendships/groups/blocks
- make expiry and mutation authorization server-side
- preserve current Gather UI and route behavior
- keep dev/test persistence isolated by test world
- preserve reload behavior through server hydration rather than local authoritative storage
