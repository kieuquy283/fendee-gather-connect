# Mobile Review 16 - Notifications

## Current State

- Static notifications are in `src/lib/fendee-data.ts`.
- Gather V2 notifications are generated in `src/lib/gather-store.tsx` and persisted in localStorage.
- Notification types include co-host, RSVP, Gather update/expiring/ended.
- Deep links route to Gather detail.
- Gather tests verify uniqueness, recipient, deep link prefix, and privacy-safe push body for seeded notifications.

## Gaps

- No real push notification provider or permission flow.
- No backend delivery guarantees, retry, deduplication, or read-state sync.
- No notification preferences or quiet hours.
- No server-side privacy template enforcement.
- Presence notification is a local synthetic notice, not delivered to selected audience.

## Readiness

PARTIAL prototype only.

