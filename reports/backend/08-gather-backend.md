# D4 Gather Backend

Date: August 9, 2026
Status: DEV/TEST GATHER BACKEND READY

## Scope

D4 moved Gather V2 authority behind authenticated server repositories without starting Chat or Push Notifications backend migration. The frontend Gather wizard, detail, manage, and notification-facing flows remain intact, but authoritative state now lives in the local server adapter instead of client-local Gather storage.

## Before

- `src/lib/gather-store.tsx` was the authoritative Gather state container.
- Audience resolution, co-host role state, RSVP transitions, and private Gather visibility were effectively local-only.
- Direct deep links depended on client-held Gather data rather than an authenticated server repository.
- Gather-specific notifications were mock/local compatibility data.

## After

### Server boundary

- `src/lib/gather-contracts.ts`
- `src/lib/gather-store.server.ts`
- `src/lib/gather-repositories.server.ts`
- `src/lib/gather.functions.ts`
- `src/lib/gather-api.server.ts`

`src/server.ts` now routes `/api/d4/*` and `/api/dev/d4/*` requests through the D4 Gather backend.

### Authenticated actor

Every Gather operation derives actor identity from the verified D1 session. The caller cannot establish authority through body `userId` fields.

### D2 policy reuse

Gather audience and authorization reuse D2 primitives and state:

- friendship checks
- block checks
- friend group resolution
- privacy records

No Gather-specific friend graph or block list was recreated.

## Domain models

### Gather

- owner
- status: `live | expired | ended`
- expiresAtMs as server-authoritative expiry
- hosts
- invites
- audienceSnapshot
- updatedAt

### GatherHost

- `role: owner | cohost`
- `cohostStatus: pending | accepted | declined`
- invitedAt
- respondedAt

### GatherInvite

- recipient personId
- `status: sent | seen | going | maybe | declined`
- immutable source metadata for how the invite was resolved

### GatherAudienceSnapshot

- source: `all_friends | groups | selected_friends | mixed`
- selected group ids
- selected friend ids
- resolved recipient ids
- resolvedAt

## Authorization model

### Owner

Can:

- create/edit Gather
- manage co-hosts and audience
- invite more
- end Gather

### Co-host

Pending co-hosts cannot use co-host permissions.

Accepted co-hosts can:

- edit permitted fields
- view/manage permitted Gather activity

Accepted co-hosts cannot:

- end/delete Gather
- change owner
- perform owner-only actions

### Invitee

Can:

- read authorized Gather
- update only their own RSVP

### Uninvited / blocked / foreign users

Cannot:

- read private Gather data
- mutate Gather state
- bypass owner/co-host/invitee boundaries

## Audience resolution

Audience resolution now happens server-side on create/invite-more:

1. resolve all-friends / groups / selected friends / mixed selection
2. deduplicate recipients
3. remove owner
4. remove blocked relationships
5. remove invalid or non-friend recipients
6. persist individual GatherInvite records

The client still computes audience previews for UX, but the server is authoritative for the final invite list.

## Expiry and server time

Server time is authoritative for Gather expiry:

- expired Gather no longer behaves as active
- RSVP updates are rejected after expiry
- ended Gather rejects active mutations

## D3 integration

D4 consumes D3 presence contracts only as read-side compatibility where Gather UI already surfaces presence-related context. D4 does not introduce live friend tracking or alter the D3 invariant.

## Test-world isolation

The D4 server adapter is bucketed by the same test-world/request isolation model used by D2 and D3:

- users in the same test world share Gather state
- parallel test worlds do not collide
- Gather domain ownership is not keyed by auth session id

## Route behavior

Gather detail and manage routes now fail closed:

- authorized viewers/managers render the Gather screen
- missing or unauthorized deep links render explicit denied states rather than exposing private Gather data

## Validation

Validated on August 9, 2026:

- D1 auth suite: 21/21 pass
- D2 backend suite: 17/17 pass
- D3 backend suite: 9/9 pass
- D4 targeted backend suite: 6/6 pass
- Gather functional: 21/21 pass
- Gather visual: 12/12 pass
- Full E2E: 141/141 pass
- Client boundary: pass
- `npm run typecheck`: pass
- `npm run lint`: pass with existing warnings only
- `npm run build`: pass

## Remaining production blockers

- production database for durable Gather persistence
- production notification delivery/read-state backend
- production identity/session infrastructure inherited from D1

