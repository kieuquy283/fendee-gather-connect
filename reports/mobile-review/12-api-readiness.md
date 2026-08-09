# Mobile Review 12 - API Readiness

## Current State

No production API client layer was found for Fendee domain data. React Query is installed and provided, but the app does not use it for domain fetch/mutation flows.

## Required Future APIs

- Auth/session and profile setup.
- Friend graph, groups, block/report/moderation.
- Presence session start/stop/update and Nearby area publication.
- Gather create/update/invite/RSVP/end/expire.
- Notification delivery, read state, deep links, and push copy.
- Chat threads, message send, read receipts, abuse controls.
- Privacy settings, account deletion, data export.

## API Requirements

- Server-side authorization on every resource.
- Idempotent mutation keys for retry.
- Offline/retry semantics for core mutations.
- Server timestamps and expiry jobs.
- Privacy-safe push notification templates.
- Rate limits and abuse detection.

## Readiness

NOT IMPLEMENTED.

