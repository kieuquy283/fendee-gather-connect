# Mobile Review 11 - Data Model

## Current Models

- `Person`, mock `me`, people, conversations, messages, notifications, Gathers.
- `Gather`, `GatherHost`, `GatherInvite`, `GatherAudienceSnapshot`, `GatherNotification`.
- `PresenceSession`, `DeviceLocation`, `FriendLocationSnapshot`, `NearbyPresenceLocation`, `FriendAudience`.

## Strengths

- Gather V2 models owner/cohost and invitees separately.
- Audience resolution deduplicates recipients and excludes owner/blocked/invalid invitees.
- Presence models support the required two-location behavior.

## Gaps

- No backend IDs, audit fields, actor IDs, policy versions, or server timestamps.
- Friend/group membership is static and not versioned.
- Block/report/moderation data models are absent.
- Message model is static and lacks delivery/read/security fields.
- Account lifecycle, consent, notification preference, and privacy setting models are absent.

## Readiness

PARTIAL for frontend prototype. NOT READY for production data integrity.

