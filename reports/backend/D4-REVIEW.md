# D4 Review

Date: August 9, 2026
Result: GATHER BACKEND READY

## Outcome

D4 completed the Gather backend migration in the local server adapter:

- Gather authority moved behind authenticated server repositories.
- OWNER / CO-HOST / INVITEE permissions are now server-enforced.
- audience resolution is server-side and block-aware
- RSVP is server-authoritative
- expiry is server-authoritative
- reload and cross-user access use shared server state inside the same test world
- D1, D2, and D3 contracts were preserved

Persistence remains DEV/TEST ONLY.

## Architecture change

### Before

- client-local Gather authority
- route access depended on hydrated client state
- co-host / invite / RSVP changes were local-first
- no authenticated D4 repository boundary

### After

- authenticated `/api/d4/*` Gather API
- typed D4 contracts and server functions
- repository-backed create/read/update/end/invite/cohost/rsvp flows
- route fail-closed behavior for missing or unauthorized Gather links

## Server models delivered

- `Gather`
- `GatherHost`
- `GatherInvite`
- `GatherRSVP` via invite status transitions
- `GatherAudienceSnapshot`

## Authorization review

Verified server behavior:

- owner can end Gather and run owner-only actions
- pending co-host cannot use co-host permissions
- accepted co-host gains allowed permissions only
- invitee can modify only their own RSVP
- stranger cannot read private Gather
- blocked users are excluded from audience resolution and access

## Audience resolution review

Server-side resolution now:

- expands all friends / groups / selected friends / mixed input
- deduplicates recipients
- removes owner
- removes blocked relationships
- removes invalid/non-friend recipients
- persists immutable invite records for the resolved audience

## D3 non-regression

D4 did not change D3 presence semantics:

- no automatic live friend tracking was introduced
- Gather reads D3-compatible state where needed, but D4 does not mutate D3 invariants

## Test-world isolation

Gather persistence uses the shared dev/test bucket model:

- same-world users interact with the same Gather dataset
- parallel worlds remain isolated
- auth session id is not used as the durable Gather owner key

## Route regression fixed during D4 closeout

The post-migration E2E regression was route-level, not repository-level:

- uninvited Gather deep links originally fell into generic missing-state rendering because the hidden Gather was absent from the hydrated client list
- detail/manage routes were updated to fail closed with explicit denied states whenever the requested Gather is not available in the actor’s authorized dataset

This restored the existing private-route UX contract without weakening server authorization.

## Validation evidence

Final verified results on August 9, 2026:

- D1: 21/21
- D2: 17/17
- D3: 9/9
- D4 targeted: 6/6
- Gather functional: 21/21
- Gather visual: 12/12
- Full E2E: 141/141
- Client boundary: PASS
- `npm run typecheck`: PASS
- `npm run lint`: PASS with existing warnings only
- `npm run build`: PASS

## Remaining blockers

- Gather persistence is still in-memory DEV/TEST ONLY
- production database is still required
- production notification delivery/read state is still required
- chat backend migration has not started

