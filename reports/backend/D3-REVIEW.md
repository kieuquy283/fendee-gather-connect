# D3 Review

Date: 2026-08-09

## Outcome

D3 status: PRESENCE/NEARBY BACKEND READY

The Presence and Nearby backend migration is complete at the architecture, policy, and deterministic dev/test enforcement layer.

Production durability and infrastructure remain outstanding and are intentionally not overstated here.

## Architecture Before

Before D3:

- Presence was client-authoritative
- Nearby used local/mock marker authority
- friend snapshot audience lived in client state
- route/provider remounts could rewrite active area
- no server TTL defended stale nearby visibility
- no server snapshot authorization enforced the intended audience

## Architecture After

After D3:

- verified D1 session actor owns every Presence operation
- D2 friendship, groups, block, and privacy are reused rather than duplicated
- server repositories own active presence session, current area, nearby publication, and friend snapshot
- the client hydrates from the server and only syncs trusted new observations
- nearby and friend snapshot remain separate domain models

## Root Cause Of The Canonical Regression

Exact cause:

- `PresenceProvider` resubscribed during auth and route hops
- `DevelopmentLocationProvider` emitted default Area A immediately on subscription
- that initial dev emission was accepted as a real sync event
- the client overwrote server-authoritative Area B with Area A
- `updateFriendLocationSnapshot()` then copied A instead of B

This was fixed by making server hydration authoritative before location sync and by ignoring the initial/default dev emission after hydration.

## Final Behavioral Guarantees

Verified guarantees:

- canonical Area A -> Moving -> Area B -> Update flow holds
- cross-user reads do not mutate owner presence state
- auth session rotation for the same user resolves the same active presence session
- old-area Nearby visibility is removed during movement
- friend snapshot remains unchanged until explicit update
- blocked users cannot see Nearby or friend snapshots
- friend recipients outside the audience cannot read the snapshot
- stale Nearby visibility expires through TTL
- reload reconstructs state from the server without duplicating the session
- provider mount/reload does not reset Area B back to default Area A

## Automated Coverage

Targeted D3 suite coverage:

- canonical Area A to Moving to Area B invariant
- cross-user non-mutation
- same-user auth-session rotation
- audience and block authorization
- TTL expiry cleanup
- permission denied before start
- permission loss while active
- block during active session
- reload reconstruction without duplicate session

## Exact Validation Results

Validated on 2026-08-09:

- canonical flow: PASS
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

## Remaining Blockers

Remaining production blockers:

- production identity provider
- durable/shared session store
- production database
- production realtime presence infrastructure
- production geospatial infrastructure
- durable moderation workflow

## Final Assessment

Presence and Nearby are backend-ready for the current local server architecture and deterministic automated validation.

D3 does not yet provide production-durable persistence, production realtime delivery, or production geospatial infrastructure.
