# Mobile Review 14 - Network Resilience

## Current State

Most product state is static or localStorage-backed, so real network failure modes are not implemented.

## Missing Behaviors

- Slow network loading skeletons for domain data.
- Request timeout and retry.
- Duplicate mutation prevention.
- Idempotency for Gather publish, RSVP, presence start/stop, friend/block/report, and chat send.
- Offline queue or explicit offline-denied behavior.
- Conflict resolution after reload.
- Server/client schema migration for older persisted state.

## Current Partial Coverage

- Gather localStorage corrupted-state fallback is tested.
- Presence has simulated offline state.

## Readiness

NOT READY for production. Core mutations currently cannot demonstrate deterministic recovery.

