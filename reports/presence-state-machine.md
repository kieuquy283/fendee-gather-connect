# Presence State Machine

## Core State

- `deviceLocation`: latest device-derived approximate zone, accuracy, moving/stable status.
- `friendLocationSnapshot`: manually shared friend snapshot. It changes only on start or explicit “Update location”.
- `nearbyPresenceLocation`: current stranger-visible Nearby zone. It follows stable device area while presence is enabled.
- `selectedFriendAudience`: all friends, friend groups, or selected friends.
- `currentNearbyZone`: stable current zone derived from device dwell logic.
- `presenceSession`: active/starting/moving/expired/offline/stopped state with expiry and notification metadata.

No visible UI exposes coordinates. Prototype state stores approximate zone ids and labels only.

## Start Presence

1. User opens the enable sheet.
2. User selects friend audience.
3. App informs user that physically nearby people may see them in Nearby while enabled.
4. App requests permission if required.
5. App starts a session.
6. App creates `friendLocationSnapshot` from current stable device zone.
7. App saves selected audience.
8. App sends one one-time notification to that audience.
9. App publishes `nearbyPresenceLocation` into the current zone.
10. App navigates to Nearby.

## Nearby Zone Logic

- Stable in Area A: `nearbyPresenceLocation = Area A`.
- Leaving Area A: remove user from Area A immediately and set Nearby stranger status to `moving`.
- Moving: strangers do not see the user. Authorized friends still see the old friend snapshot.
- Stable in Area B: `nearbyPresenceLocation = Area B`, but `friendLocationSnapshot` remains Area A until manual update.

The prototype uses configurable accuracy and dwell thresholds. Inaccurate readings or quick crossings keep Nearby hidden/moving until stable.

## Friend Snapshot Logic

- Friends selected when presence starts receive a snapshot.
- Snapshot remains unchanged as the device moves.
- If `friendLocationSnapshot.zoneId !== currentNearbyZone.id`, UI shows an outdated snapshot warning.
- “Update location for friends” opens confirmation:
  - Previous: old zone
  - New: current zone
  - Audience count
  - Optional notify-again checkbox
- Confirm updates only `friendLocationSnapshot`.

## Stop Presence

Stopping presence:

- Stops watcher simulation.
- Removes Nearby stranger presence immediately.
- Ends active friend-sharing session.
- Clears active indicators.
- Leaves no active shared location visible.

## Prototype API Surface

- `startPresence(audience)`
- `stopPresence()`
- `updateFriendLocation(options)`
- `changeAudience(audience)`
- `handleDevicePosition(input)`
- `handleZoneTransition(zoneId, accuracy, dwellMs)`
- `simulatePermission(status)`
- `expirePresence()`
- `setOffline(offline)`
