# Backend Remediation Map

Date: 2026-08-09

## Scope

This map covers every `REQUIRES BACKEND` finding currently recorded in:

- `reports/mobile-review/issues.csv`
- `reports/mobile-review/FINAL-MOBILE-REVIEW.md`
- `reports/mobile-review/PHASE-A-REVIEW.md`
- `reports/mobile-review/PHASE-C-REVIEW.md`

Note: `reports/mobile-review/PHASE-B-REVIEW.md` does not exist in the repository. Phase B evidence is derived from `reports/mobile-review/remediation-phase-b.md` and current code.

## Current Production Status

- Frontend: `FRONTEND RC READY`
- Production: `READY WITH BACKEND BLOCKERS`

## Backend Blocker Inventory

| Issue ID | Severity | Area | Current frontend mitigation | Production requirement |
|---|---|---|---|---|
| `MPR-001` | P0 | Authentication | `DevelopmentAuthRepository` stores a dev session in `localStorage`; route gating uses `RequireAuth` | Production identity provider, verified session issuance, refresh, revoke, logout, expired-session handling |
| `MPR-002` | P0 | Authorization | `src/lib/authorization.ts` and route/store guards hide UI locally | Server-side authorization on every protected resource and mutation |
| `MPR-003` | P1 | Privacy storage | Sensitive social/location state remains in source mocks or `localStorage` | Durable server storage, retention, access control, reduced client exposure |
| `MPR-004` | P1 | Device/location presence | `PresenceProvider` simulates permission and presence state | Real geolocation adapter, presence session API, heartbeat/expiry, permission lifecycle |
| `MPR-005` | P1 | Blocking/reporting/moderation | `PrivacyProvider` stores block/report state locally | Durable block/report state, server enforcement, moderation workflow |
| `MPR-006` | P1 | Account lifecycle | Account deletion returns `pending_backend`; logout is local cleanup | Verified deletion workflow, retention policy, session revocation, export/deletion orchestration |
| `MPR-007` | P1 | Resource privacy / deep links | Routes load mock/local entities by ID and fail closed only inside UI | Authorized loaders/API access, signed-out and revoked-access handling, no private cached exposure |
| `MPR-008` | P1 | Chat | Static conversations/messages in source data, local route checks only | Durable conversations/messages, membership enforcement, abuse controls, retry/pagination |
| `MPR-009` | P1 | Notifications / delivery | Local Gather notifications and static notices only | Server-generated notifications, delivery boundary, push devices/subscriptions, deep-link authorization |
| `MPR-010` | P1 | Presence privacy cleanup | Stop/revoke only clears local state | Server-side unpublish, TTL cleanup, stale visibility protection |
| `MPR-033` | P3 | Notification durability | Read/unread/action-required states are local | Persistent notification state, actor-specific read markers, idempotent mutation API |

## Dependency Graph

1. Authentication and session verification
   - Unlocks: `MPR-001`, `MPR-002`, `MPR-006`, `MPR-007`, `MPR-008`, `MPR-009`
2. Durable user, friendship, group, and privacy storage
   - Unlocks: `MPR-003`, `MPR-005`, `MPR-007`, `MPR-009`
3. Authorization policy enforcement
   - Depends on: authenticated identity, durable resource ownership/membership
   - Unlocks: `MPR-002`, `MPR-005`, `MPR-007`, `MPR-008`, `MPR-009`, `MPR-033`
4. Presence infrastructure
   - Depends on: auth, privacy/blocking, device geolocation adapter
   - Unlocks: `MPR-004`, `MPR-010`
5. Gather backend
   - Depends on: auth, friendships/groups, authorization, notifications
   - Unlocks: portions of `MPR-002`, `MPR-007`, `MPR-009`
6. Chat backend
   - Depends on: auth, block state, authorization
   - Unlocks: `MPR-008`
7. Moderation and account lifecycle
   - Depends on: auth, durable storage, audit events, notifications
   - Unlocks: `MPR-005`, `MPR-006`

## Recommended Migration Order

1. Auth and session verification
2. User/profile and friendship/group storage
3. Privacy/block/report enforcement
4. Presence and nearby querying
5. Gather persistence and audience resolution
6. Chat persistence and membership checks
7. Notifications and push delivery
8. Account deletion/export/moderation workflows

## Per-Issue Requirements

### `MPR-001` Authentication

- Current frontend mitigation:
  - `src/lib/auth.tsx`
  - `DevelopmentAuthRepository`
  - `RequireAuth`
- Data involved:
  - User identity
  - Session metadata
  - Session expiry
- Authorization requirement:
  - Server must derive actor identity from verified session, never client `userId`
- Privacy requirement:
  - Session tokens/identifiers must not be stored as trust anchors in plain local app state
- Required API:
  - `POST /auth/sign-in`
  - `POST /auth/sign-out`
  - `GET /auth/session`
  - `POST /auth/refresh`
- Required persistence:
  - Users
  - Sessions
  - Revocation state
- Required tests:
  - Session create/load/refresh/revoke/expire
  - Protected request rejects unauthenticated actor
- Dependencies:
  - User table
  - Session store

### `MPR-002` Authorization

- Current frontend mitigation:
  - `src/lib/authorization.ts`
  - Gather route/store guards
  - Local blocked checks
- Data involved:
  - Ownership
  - Membership
  - Invite records
  - Block relationships
- Authorization requirement:
  - Object-level server enforcement for profile, friends, groups, presence, Gather, chat, notifications, reports
- Privacy requirement:
  - No unauthorized reads by guessed ID
- Required API:
  - Policy applies to every protected route and mutation; not a single endpoint
- Required persistence:
  - Resource ownership/membership state
  - Blocks
  - Visibility preferences
- Required tests:
  - IDOR and horizontal privilege escalation cases for each domain
- Dependencies:
  - Auth
  - Domain persistence

### `MPR-003` Privacy Storage

- Current frontend mitigation:
  - `src/lib/prototype-storage.ts`
  - local cleanup on sign-out
- Data involved:
  - Presence zone state
  - Gather invites/RSVP
  - Reports
  - Block list
  - Profile/social metadata
- Authorization requirement:
  - User-scoped read/write access only
- Privacy requirement:
  - Durable retention and deletion controls; minimize sensitive client persistence
- Required API:
  - Domain APIs only; no direct client trust in cached social/location state
- Required persistence:
  - Relational backend storage with audit timestamps
- Required tests:
  - Sign-out clears client cache without losing authoritative server data
  - User cannot read another user's private records
- Dependencies:
  - Auth
  - Schema/migrations

### `MPR-004` Device / Location Presence

- Current frontend mitigation:
  - `src/lib/presence-store.tsx`
  - simulated permission and zone transitions
- Data involved:
  - Presence session
  - Nearby area publication
  - Friend location snapshot
  - Permission state
- Authorization requirement:
  - Only authenticated actor may publish/unpublish their own presence
- Privacy requirement:
  - Nearby returns approximate/relative data only; friend snapshot stays separate from live nearby presence
- Required API:
  - `POST /presence/sessions`
  - `POST /presence/{id}/heartbeat`
  - `POST /presence/{id}/stop`
  - `POST /presence/{id}/friend-snapshot`
  - `GET /nearby`
- Required persistence:
  - Presence sessions
  - Nearby visibility records or derived query state
  - Friend snapshot records
- Required tests:
  - Start/stop/move/offline/permission lost/expiry
  - Stale session cleanup
- Dependencies:
  - Auth
  - Geolocation adapter
  - Privacy/block enforcement

### `MPR-005` Blocking / Reporting / Moderation

- Current frontend mitigation:
  - `src/lib/privacy-store.tsx`
  - local block/report mutations only
- Data involved:
  - Block relationships
  - Report records
  - Moderation states
- Authorization requirement:
  - Only reporter can create own report
  - Report target cannot read report records
  - Blocked relationships filter profile, presence, Gather, chat, notifications
- Privacy requirement:
  - Moderation data is private and admin-scoped
- Required API:
  - `POST /blocks`
  - `DELETE /blocks/{targetId}`
  - `POST /reports`
  - admin moderation endpoints later
- Required persistence:
  - Blocks
  - Reports
  - Moderation status/audit events
- Required tests:
  - Block affects all dependent domains
  - Report visibility and status transitions
- Dependencies:
  - Auth
  - Authorization
  - Audit logging

### `MPR-006` Account Lifecycle

- Current frontend mitigation:
  - `AuthRepository.requestAccountDeletion()` returns `pending_backend`
  - sign-out clears local prototype storage
- Data involved:
  - User account
  - Sessions
  - Presence state
  - Notifications/devices
  - Reports/export/deletion requests
- Authorization requirement:
  - Only current authenticated user may request deletion/export
- Privacy requirement:
  - Retention and anonymization policy
  - Deletion must stop presence and push delivery
- Required API:
  - `POST /account/deletion-requests`
  - `POST /account/export-requests`
  - `POST /auth/sign-out-all`
- Required persistence:
  - Deletion requests
  - Export jobs
  - Audit events
- Required tests:
  - Request, confirm, revoke sessions, cleanup visibility
- Dependencies:
  - Auth
  - Notifications
  - Presence cleanup

### `MPR-007` Resource Privacy / Deep Links

- Current frontend mitigation:
  - Route-level fail-closed states
  - local lookup by mock ID
- Data involved:
  - Profiles
  - Gather details
  - Conversations
  - Notifications
- Authorization requirement:
  - Loader/API must verify actor access before returning resource payload
- Privacy requirement:
  - Never render private cached payload before auth check completes
- Required API:
  - Authenticated loaders or JSON APIs for each resource
- Required persistence:
  - All referenced resource records
- Required tests:
  - Signed out, expired session, revoked access, deleted target, blocked relationship
- Dependencies:
  - Auth
  - Authorization

### `MPR-008` Chat

- Current frontend mitigation:
  - `src/lib/fendee-data.ts` static conversations/messages
  - local route access checks
- Data involved:
  - Conversations
  - Participants
  - Messages
  - Delivery/read timestamps
- Authorization requirement:
  - Only participants may read/send
  - Blocked users cannot continue protected messaging
- Privacy requirement:
  - Message bodies are private and audit logs must exclude raw content
- Required API:
  - `GET /conversations`
  - `GET /conversations/{id}`
  - `GET /conversations/{id}/messages`
  - `POST /conversations/{id}/messages`
- Required persistence:
  - Conversations
  - Participants
  - Messages
- Required tests:
  - Non-participant denied
  - Pagination
  - Retry/failure
  - Block enforcement
- Dependencies:
  - Auth
  - Authorization
  - Block state

### `MPR-009` Notifications

- Current frontend mitigation:
  - local Gather notifications
  - static notice list
- Data involved:
  - Notification event
  - Recipient
  - Deep link
  - Read state
  - Push preview text
- Authorization requirement:
  - Server must validate recipient access before creating and before serving target detail
- Privacy requirement:
  - Lock-screen copy must be privacy-safe
- Required API:
  - `GET /notifications`
  - `POST /notifications/{id}/read`
  - server-side event emitters for friend/presence/Gather/chat actions
- Required persistence:
  - Notifications
  - Device subscriptions
  - Delivery jobs/outbox
- Required tests:
  - Revoked access stops delivery
  - Deep links re-check auth and authorization
- Dependencies:
  - Auth
  - Domain backends
  - Push infrastructure

### `MPR-010` Presence Privacy Cleanup

- Current frontend mitigation:
  - local `stopPresence()`
  - simulated `expirePresence()`
- Data involved:
  - Presence session TTL
  - Nearby visibility
  - Friend snapshot lifecycle
- Authorization requirement:
  - Only owner/session service may stop own visibility
- Privacy requirement:
  - Crash or revoked permission must not leave user visible indefinitely
- Required API:
  - heartbeat and stop endpoints
  - server cleanup job/process
- Required persistence:
  - Expiring presence session records
  - TTL/index support
- Required tests:
  - Browser crash/stale heartbeat/session expiry cleanup
- Dependencies:
  - Presence infrastructure
  - Auth

### `MPR-033` Notification Durability

- Current frontend mitigation:
  - notification state is local to current browser state
- Data involved:
  - Per-recipient read state
  - action-required state
  - event lifecycle
- Authorization requirement:
  - Only recipient may mutate read state
- Privacy requirement:
  - No cross-user notification lookup by ID
- Required API:
  - `GET /notifications`
  - `POST /notifications/{id}/read`
- Required persistence:
  - Notification rows
  - Recipient indexes
- Required tests:
  - Arbitrary notification ID access denial
- Dependencies:
  - Auth
  - Authorization
  - Notifications backend

## Exit Criteria For Phase D

An issue above only moves from `REQUIRES BACKEND` to `FIXED` when:

- the enforcing backend path exists;
- persistence exists where required;
- object-level authorization is server-side;
- automated tests cover both success and unauthorized cases; and
- frontend behavior is still validated against the existing mobile test suite.
