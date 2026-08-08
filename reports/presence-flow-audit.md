# Fendee Presence / Location Flow Audit

## Summary

The current implementation treats presence as mostly static mock data plus local UI state. Home, Nearby, Station, and Profile each own separate presence/location controls, so enabling or disabling presence in one screen does not consistently change the others.

## Current Screen Flow

### Home

- `src/routes/home.tsx` owns local `mode`, `duration`, and `leftStation` state.
- `AppearSheet` enables a broad `"friends"` or `"public"` mode, but does not request permission, start a shared session, create a friend snapshot, publish Nearby, or notify an audience.
- Home displays `station` from `src/lib/fendee-presence.ts` as the current place, independent of any real or shared state.
- “Cập nhật vị trí” is visual only and does not update a shared location model.

### Nearby

- `src/routes/nearby.index.tsx` owns local `enabled` state.
- Nearby defaults to enabled and reads static `nearbyMarkers` from `src/lib/fendee-presence.ts`.
- The radar is a relative spatial frame, not a map, which matches the product direction.
- There is no permission-required state, no moving/hidden transition, no zone dwell/accuracy logic, and no separate friend-location snapshot behavior.

### Station

- `src/routes/tram.tsx` reads static `station`, `presencePeople`, and filters.
- Station does not use the same enabled/off/session state as Home or Nearby.
- It does not distinguish current Nearby zone from friend-shared snapshot location.

### Profile

- `src/routes/profile.index.tsx` owns local `vis` state for visibility.
- The visibility settings do not start/stop presence and are disconnected from Home/Nearby.
- Profile does not show the active friend snapshot, selected audience, or update-location confirmation.

### Presence Components

- `src/components/fendee/presence.tsx` renders cards, rails, legends, avatars, and state cards from static `PresencePerson`.
- It has presentation-only presence labels: `gather`, `public`, `friends`, `stale`.
- It does not know whether the current user is actively sharing.

### Presence Data / State

- `src/lib/fendee-presence.ts` contains static mock people, station, gathers, nearby markers, and filters.
- No centralized state machine exists.
- No separate `deviceLocation`, `friendLocationSnapshot`, `nearbyPresenceLocation`, `selectedFriendAudience`, `currentNearbyZone`, or `presenceSession` exists.

### Permission Logic

- There is no real shared permission model.
- Nearby previously had local permission experiments, but the current pulled implementation only has a local enabled switch.

### Notification UI

- `src/routes/notifications.tsx` renders static notices from `src/lib/fendee-data.ts`.
- There is no one-time presence notification tied to the selected audience.

### QuickPreview

- `QuickPreview` in `src/components/fendee/sheets.tsx` shows avatar, role, distance, status, Give/Need, and profile navigation.
- Nearby marker sheet already includes Connect, Invite Gather, View profile.
- Both are driven by static person data and not by the centralized presence session.

### AppShell

- `src/components/fendee/AppShell.tsx` only renders layout and bottom navigation.
- It does not expose any active presence indicator or privacy state.

## Main Gaps Against Required Behavior

- Nearby stranger presence and friend shared location are not separate models.
- Friend location is not snapshot-based.
- Enabling presence does not configure friend audience first.
- Presence does not navigate to Nearby after start.
- Device movement does not hide stale Nearby markers while moving.
- Nearby zone changes do not update stranger presence independently from friends.
- Stop presence does not clear active indicators across the app.
- Required states are not centrally modeled or visually testable.
