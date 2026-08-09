# D3 Presence Map

Date: 2026-08-09

## Scope

This document records the final D3 location flow after the Presence + Nearby + Friend Location Snapshot backend migration.

It captures:

- the final authority boundary
- the two-location invariant
- the Area A -> Moving -> Area B -> Update flow
- the root cause of the Area B -> Area A regression
- the final hydration and subscription rule
- the deterministic dev/test isolation model

## Final Authority

Final request and UI flow:

UI routes/components
-> `PresenceProvider` in `src/lib/presence-store.tsx`
-> presence client contracts in `src/lib/presence-contracts.ts`
-> server functions / API wrapper
-> authenticated server repository
-> dev/test in-memory presence adapter in `src/lib/presence-store.server.ts`

Authoritative identity:

- verified D1 session actor from `src/lib/server-auth.server.ts`

Authoritative relationship and privacy policy:

- D2 server primitives for friendship, block, groups, and privacy

Authoritative active presence state:

- server repository state keyed by test world + user id

The client is no longer the source of truth for active presence area or friend snapshot visibility.

## Final Domain Split

Fendee now preserves two independent location models.

### Nearby Presence

- follows the current accepted area automatically
- is visible only while the presence session is active and not stale
- is unpublished when the user is moving, permission is lost, or TTL expires

### Friend Location Snapshot

- is created at presence start
- is visible only to the immutable authorized audience snapshot, subject to current safety checks
- does not move automatically with GPS updates
- changes only when the owner explicitly calls `updateFriendLocationSnapshot()`

This invariant is covered by the canonical D3 test.

## Final Presence Lifecycle

Start flow:

1. authenticated actor starts presence
2. server resolves and persists the friend audience snapshot
3. server creates `PresenceSession`
4. server publishes initial `NearbyPresence`
5. server creates initial `FriendLocationSnapshot`
6. client hydrates from server state
7. client starts location observation after hydration

Area transition flow:

1. accepted Area A sample publishes Nearby A
2. moving/untrusted sample unpublishes Nearby
3. stable Area B sample atomically persists current area B and publishes Nearby B
4. friend snapshot remains A
5. explicit update copies current authoritative server location B into the friend snapshot

Stop flow:

1. authenticated actor stops presence
2. server ends the presence session
3. server removes active nearby visibility
4. friend snapshot is no longer readable as an active share
5. client stops watching location and returns to OFF state

## Final Hydration Rule

The client now follows this rule:

server hydration first -> stable location subscription -> ignore initial/default dev emission -> sync only real new observations

This prevents a DevelopmentLocationProvider default sample from overwriting a newer server-authoritative area.

## Root Cause Of The Area B -> Area A Regression

The failing canonical transition was not caused by the server transition model itself.

Root cause:

- `PresenceProvider` re-subscribed during auth and route hops
- `DevelopmentLocationProvider` immediately emitted its default Area A sample on a fresh subscription
- that initial dev emission was treated as a real new observation
- the client synced Area A back to the server after the server had already accepted Area B
- `updateFriendLocationSnapshot()` then copied the overwritten Area A instead of the intended Area B

The failure was therefore a client rehydration/subscription bug that corrupted server-authoritative state.

## Final Fix

`src/lib/presence-store.tsx` now:

- hydrates active presence from the server before trusting location events
- keeps presence/session refs stable across auth and route transitions
- ignores the initial/default development location emission after hydration
- syncs only real new observations

Server state remains authoritative once Area B has been accepted.

## Test World Isolation

Presence dev/test persistence is partitioned by test world and then keyed by domain identities:

- test world id isolates parallel executions
- auth session id authenticates the current request actor
- user id owns durable presence domain state inside that world

Correct model:

`PresenceStore[testWorldId][userId]`

Incorrect model that was avoided:

`PresenceStore[authSessionId]`

This keeps Alice/Bob/Cara in one world interacting with the same domain dataset while keeping parallel Playwright worlds isolated.

## Current D3 Authorization Rules

Nearby results are returned only when:

- the target presence session is active
- the nearby publication is current and not expired
- the target is currently in the relevant area
- no block exists in either direction
- privacy/discoverability permits exposure

Friend snapshot reads are returned only when:

- the requesting actor is in the stored audience snapshot
- the session is active
- no block exists in either direction
- current safety relationships remain valid

Audience snapshot intent is immutable for the active share, but current block/friend/privacy rules can still revoke access immediately.

## TTL And Permission Semantics

Nearby visibility has server-side TTL semantics in the dev/test adapter.

If refresh stops:

- Nearby visibility expires server-side
- stale presence is hidden even without explicit client cleanup

Permission loss behavior:

- Nearby visibility is unpublished
- friend snapshot remains the last deliberate shared snapshot until stop/expiry
- UI must not claim live friend tracking

## Validation Evidence

Validated on 2026-08-09:

- canonical Area A -> Moving -> Area B -> Update flow: PASS
- repeated canonical runs: 5/5 PASS
- D3 targeted suite: 9/9 PASS
- D1 auth suite: 21/21 PASS
- D2 suite: 17/17 PASS
- Gather functional: 21/21 PASS
- Gather visual: 12/12 PASS
- full E2E: 141/141 PASS
- client boundary: PASS
- `npm run typecheck`: PASS
- `npm run lint`: PASS with existing warnings only
- `npm run build`: PASS

## Remaining Production Gaps

D3 is complete for local server enforcement and deterministic dev/test behavior, but production infrastructure is still not complete.

Remaining blockers:

- production identity provider
- durable/shared session store
- production database
- production realtime presence infrastructure
- production geospatial infrastructure
- durable moderation workflow
