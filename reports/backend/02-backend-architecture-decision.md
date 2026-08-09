# Backend Architecture Decision

Date: 2026-08-09

## Decision

No production backend platform has been intentionally selected in the repository.

The codebase does show one hosting signal:

- `@lovable.dev/vite-tanstack-config` notes a Cloudflare-default Nitro build target
- `.output/server/wrangler.json` exists after build

This is a deployment/runtime clue for the frontend/SSR layer, not evidence of a chosen production data/auth backend.

Decision for Phase D:

- define the backend in a vendor-neutral way;
- keep the backend transport and repository contracts compatible with the existing TanStack Start / Nitro app;
- prefer an HTTP/JSON API plus background-job boundaries that can run behind the same product deployment surface or as adjacent services;
- avoid locking the product to a data/auth vendor until the repo or environment supplies that choice explicitly.

## Why This Decision Is Correct

- There is no existing ORM, migration tool, database schema, or auth provider dependency in `package.json`.
- There are no environment files checked in.
- The README explicitly states the app still lacks production auth, server authorization, durable repositories, and presence/push infrastructure.
- The frontend already has development adapters and repository seams. Those should be preserved regardless of backend vendor.

## Non-Goals

- Do not select Supabase, Firebase, Convex, Appwrite, Clerk, Auth0, or a custom stack arbitrarily.
- Do not rewrite stable frontend providers just to satisfy a hypothetical backend library.
- Do not treat the current Cloudflare-compatible SSR output as proof that Workers KV/D1/Durable Objects/R2 must be used.

## Required Backend Capabilities

### Relational data

Need durable records and constraints for:

- users
- friendships and friend groups
- blocks and reports
- Gather entities
- conversations and messages
- notifications
- devices/subscriptions
- account lifecycle records
- audit events

Requirement:

- relational database with transactions, foreign keys, unique constraints, and indexed expiration queries

### Authentication

Need:

- real identity provider
- verified session issuance
- logout and revocation
- session refresh
- expired-session handling

Requirement:

- server-owned session verification
- client cannot prove identity by sending `userId`

### Authorization

Need:

- object-level authorization for every protected query and mutation
- relationship-aware enforcement using friendship, invite, participant, and block state

Requirement:

- policy layer on the server
- domain services must authorize before read/write

### Realtime / presence

Need:

- presence session heartbeat
- fast stale-session expiry
- nearby query filtering
- separate manual friend snapshot flow

Requirement:

- low-latency write path
- server cleanup or TTL mechanism
- query model for approximate nearby visibility

### Geospatial / relative nearby

Need:

- store enough location/area data to determine nearby scope
- return relative/approximate distance only to the client

Requirement:

- area-based or grid-based presence indexing
- avoid exposing precise raw coordinates to UI unless strictly required

### Durable chat

Need:

- conversation membership
- message persistence
- pagination
- blocked-user enforcement

Requirement:

- append-oriented message storage with conversation participant indexes

### Push notification jobs

Need:

- server-generated events
- recipient authorization before fan-out
- privacy-safe preview text

Requirement:

- outbox/job system
- device/subscription store
- delivery retry/observability

### Account deletion and export

Need:

- verified deletion request
- session revocation
- presence cleanup
- push stop
- export job planning
- retention handling

Requirement:

- account lifecycle job/service boundary

### Moderation

Need:

- durable reports
- status transitions
- audit trail
- admin-only access later

Requirement:

- moderation tables and service layer even if no admin UI exists yet

### Audit logging

Need:

- security-relevant event records without storing secrets, tokens, raw message bodies, or precise location unnecessarily

Requirement:

- append-only audit event store with actor/resource/timestamp metadata

### Storage

Need:

- asset/object storage only if Gather images or export bundles become durable

Requirement:

- object storage adapter; not needed for the first auth/friend/presence/chat schema itself

### Deployment

Need:

- environment separation:
  - development
  - test
  - staging
  - production
- startup validation for required variables

Requirement:

- configuration module with explicit feature flags and env validation

### Migrations

Need:

- reproducible schema setup
- incremental migrations
- local reset
- isolated test database bootstrap

Requirement:

- migration tool selected alongside the eventual backend stack

## Recommended Logical Architecture

### Client

- existing React/TanStack frontend
- keep providers and UX guards
- replace local adapters with production repository adapters behind feature flags

### API layer

- authenticated HTTP API
- resource loaders for route data may call the same service layer
- all protected requests derive actor from verified session

### Domain services

- auth/session service
- friendship/group service
- privacy/block/report service
- presence service
- Gather service
- chat service
- notification service
- account lifecycle service

### Persistence layer

- relational primary store
- optional cache/ephemeral layer for presence heartbeat and nearby indexing if needed later
- job/outbox store for notifications and account lifecycle work

### Background processing

- presence cleanup
- notification fan-out
- Gather expiry processing where needed
- account deletion/export workflows

## API Style Decision

Use explicit repository-backed HTTP/JSON endpoints with predictable error codes:

- `UNAUTHENTICATED`
- `FORBIDDEN`
- `NOT_FOUND`
- `EXPIRED`
- `VALIDATION_ERROR`
- `RATE_LIMITED`
- `CONFLICT`

Reason:

- aligns with the current frontend repository abstraction
- keeps vendor-neutral boundaries
- works with TanStack loaders, actions, and React Query if introduced later

## Presence Architecture Decision

Keep two separate backend models:

1. Nearby stranger presence
   - dynamic
   - expiring
   - approximate
2. Friend location snapshot
   - manual
   - audience-scoped
   - not auto-updated by movement

This matches the current correct frontend invariant and must not be collapsed.

## Feature Flag Strategy

Centralize migration flags such as:

- `productionAuth`
- `serverPresence`
- `serverGather`
- `serverChat`
- `serverNotifications`

Reason:

- allows domain-by-domain migration without breaking the frontend
- avoids ad hoc environment checks in UI components

## Required Future Stack Decisions

These can remain open until implementation begins, but must be chosen before code lands for each domain:

- identity provider or custom auth implementation
- relational database vendor
- migration tool
- job queue / outbox mechanism
- presence ephemeral store strategy
- push delivery provider

## Conclusion

Phase D should proceed with:

- vendor-neutral schema and service contracts now;
- production repository adapters behind existing frontend seams;
- backend vendor choice deferred until the repository or runtime environment explicitly supports it.
