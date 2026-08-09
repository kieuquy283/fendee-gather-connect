# Mobile Review 07 - Location Presence

## Fendee Rule Verification

The current store preserves the intended separation:

- Nearby stranger presence uses `nearbyPresenceLocation`.
- Authorized friends use `friendLocationSnapshot`.
- `handleDevicePosition` updates Nearby publication only after dwell/accuracy checks.
- `updateFriendLocation` changes the friend snapshot only when called explicitly.
- `stopPresence` clears `friendLocationSnapshot`, `nearbyPresenceLocation`, and `presenceSession`.

## Production Gaps

- No real `navigator.geolocation.watchPosition` lifecycle exists.
- Permission request/revocation is simulated through `simulatePermission`.
- No real Permissions API listener, timeout, cached-position age policy, background behavior, or app foreground/resume behavior exists.
- No backend presence session exists, so there is no server-side immediate removal from prior Nearby areas.
- Presence localStorage keeps approximate zone/session state; suitable for prototype continuity, not production privacy.

## Readiness

The state-machine design is directionally correct. Production location handling is NOT IMPLEMENTED.

