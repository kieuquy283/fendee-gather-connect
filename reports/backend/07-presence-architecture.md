# Presence Architecture

Date: 2026-08-09

## Status

D3 status: PRESENCE/NEARBY BACKEND READY

Persistence: DEV/TEST ONLY

Realtime/geospatial: DEV/TEST ONLY

## Before D3

Before D3, Presence authority lived in the client:

- `PresenceProvider` owned active session state
- Nearby markers were derived from local/mock data
- friend audience lived locally
- route hops and provider remounts could rewrite active state from dev defaults
- there was no server TTL, no authoritative nearby query, and no server snapshot authorization

The product already had the correct conceptual split between Nearby and friend snapshots, but the boundary was still local.

## After D3

After D3, Presence is behind authenticated server repositories:

- D1 verified session establishes the actor
- D2 friendship, block, groups, and privacy remain authoritative policy inputs
- D3 server repositories own active presence session, current area, nearby publication, friend snapshot, and TTL
- the client hydrates from the server and then syncs trusted new location observations

## Domain Models

### PresenceSession

Owns the authenticated user's active sharing lifecycle.

Key fields:

- `id`
- `userId`
- `status`
- `startedAt`
- `expiresAt`
- `endedAt`
- `audienceSnapshot`
- `currentAreaId`
- `latestAcceptedLocationSample`

### NearbyPresence

Owns dynamic nearby discoverability.

Key fields:

- `userId`
- `presenceSessionId`
- `areaId`
- `status`
- `updatedAt`
- `expiresAt`
- `approximatePosition`

### FriendLocationSnapshot

Owns explicit friend-facing shared location.

Key fields:

- `id`
- `presenceSessionId`
- `ownerUserId`
- `areaId`
- `place`
- `approximatePosition`
- `updatedAt`

### Audience Snapshot

Resolved once when sharing starts.

Rules:

- groups are resolved server-side at session start
- owner is removed
- blocked and invalid recipients are removed
- the intended audience does not silently expand later
- current block/friend/privacy changes can still revoke access

## State Machine

D3 uses explicit presence states rather than ad hoc boolean combinations.

Supported states include:

- `OFF`
- `STARTING`
- `ACTIVE_AREA`
- `MOVING`
- `FRIEND_SNAPSHOT_OUTDATED`
- `PERMISSION_LOST`
- `EXPIRED`
- `STOPPING`
- `ERROR`

## Area Transition Model

Canonical invariant:

Area A:

- Nearby = A
- Friends = A

Moving:

- Nearby = hidden
- Friends = A

Area B:

- Nearby = B
- Friends = A

Update location:

- Nearby = B
- Friends = B

This is a product requirement, not a temporary test artifact.

## Root Cause And Correction

Regression cause:

- provider resubscription during auth/route hops
- immediate default Area A emission from `DevelopmentLocationProvider`
- initial dev emission treated as a real sample
- server Area B overwritten before explicit friend snapshot update

Correction:

- hydrate from server first
- keep location subscription stable
- ignore initial/default dev emission after hydration
- sync only real new observations

## Authorization

All D3 operations derive actor identity from the verified server session.

No presence operation trusts `body.userId` for ownership.

Nearby and snapshot exposure both enforce:

- authenticated actor
- active session
- expiry
- block in either direction
- friendship and audience where required
- privacy/discoverability rules

## TTL Strategy

Nearby visibility is protected by server-side expiry in the dev/test adapter.

This covers:

- browser crash
- tab close
- network interruption
- permission-loss cleanup failures
- missing explicit stop requests

Friend snapshots are not refreshed by heartbeat.

## Location Provider Semantics

Client location is abstracted behind a provider interface:

- `requestPermission()`
- `getCurrentPosition()`
- `watchPosition()`
- `stopWatching()`

Development/test semantics are deterministic and support:

- Area A
- moving
- Area B
- permission denied
- permission lost
- stale/offline behavior

Provider construction alone must not emit a state-changing default sample into an already hydrated active session.

## Isolation Model

The final D3 dev/test storage model separates:

- test world id for parallel isolation
- auth session id for current request authentication
- user id and presence session id for domain ownership

This allows:

- multiple users in one shared world
- session rotation for the same user without losing presence state
- parallel Playwright projects without global collisions

## Import Boundary

Client-safe modules do not import:

- server presence repository implementations
- server auth internals
- Node-only modules

Client/server boundary remains validated by the boundary regression check.

## Validation

Validated on 2026-08-09:

- D1 auth suite: 21/21 PASS
- D2 suite: 17/17 PASS
- D3 targeted suite: 9/9 PASS
- repeated canonical runs: 5/5 PASS
- Gather functional: 21/21 PASS
- Gather visual: 12/12 PASS
- full E2E: 141/141 PASS
- client boundary: PASS
- `npm run typecheck`: PASS
- `npm run lint`: PASS with existing warnings only
- `npm run build`: PASS

## Production Blockers

Not fixed by D3:

- production identity provider
- durable/shared session store
- production database
- production realtime infrastructure
- production geospatial infrastructure
- durable moderation workflow
