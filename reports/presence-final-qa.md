# Presence Final QA

## Automated Checks

- `npm run build`: passed.
- `npm run lint`: passed with 11 warnings and 0 errors.

Warnings are `react-refresh/only-export-components` in existing shared UI/component files and the new provider module. They do not block the build.

## Local Runtime Check

- Started the Vite dev server.
- Confirmed `http://127.0.0.1:5173/home` returned HTTP 200.
- Stopped the dev server after the check.

## Flow Coverage

### A -> moving -> B

Implemented via Nearby QA controls:

1. Start presence from Home or Nearby.
2. Initial stable device area is Area A.
3. Press `Move outside A`.
4. State becomes Moving.
5. Nearby frame remains visible, but stranger markers are hidden because `nearbyPresenceLocation` is cleared.
6. Press `Stable Area B`.
7. Nearby publishes Area B.
8. Friend snapshot remains Area A.
9. UI shows Friend Snapshot Outdated.

Expected model:

- Nearby: A -> hidden -> B.
- Friends: A -> A -> A.

### Update Location

Implemented via `UpdateLocationSheet`:

1. When device area and friend snapshot differ, press `Update location for friends`.
2. Sheet shows Previous and New areas.
3. Sheet shows audience count.
4. Optional `Notify friends again` checkbox is available.
5. Confirm updates only `friendLocationSnapshot`.

Expected model after confirm:

- Friends: A -> B.
- Nearby remains B.

### Disable Presence While Moving

Implemented via `StopPresenceSheet` from Moving state:

- Stops session.
- Clears friend snapshot.
- Clears Nearby presence location.
- Global active indicator disappears.

### Disable Presence In B

Implemented via Stop presence controls in Home, Nearby, and Profile:

- Clears `presenceSession`, `friendLocationSnapshot`, and `nearbyPresenceLocation`.

### App Reload

Provider persists non-sensitive prototype session state in `localStorage` under `fendee-presence-state`.

Persisted fields are approximate zone labels/state only, not precise coordinates.

### Permission Revoked

Implemented via `simulatePermission("lost")` and `setOffline(true)` controls:

- Nearby hidden.
- Session status becomes offline.
- Global AppShell indicator shows permission/offline state.

### GPS Inaccurate

Implemented via Nearby `GPS inaccurate` control:

- Accuracy over threshold clears Nearby publication.
- Device motion becomes inaccurate.
- Friend snapshot remains unchanged.

### Quickly Crossing Boundaries

Implemented by dwell logic in `handleDevicePosition`:

- Dwell below `stableDwellMs` marks Moving.
- Nearby publication is cleared until stable dwell is reached.

### No Nearby Users

Implemented via Area C control:

- Nearby remains active.
- Radar frame remains visible.
- Empty state appears inside the frame.

### Audiences

Audience selection sheet supports:

- All friends
- Friend groups
- Selected friends

Profile also allows changing the selected audience without changing the friend snapshot.

## Visual QA Note

I attempted browser screenshot automation, but this workspace does not have Playwright installed in `node_modules`, and the available Node REPL could not resolve a browser automation package. The implementation was still checked through build/lint and a live HTTP dev-server smoke check. The UI states are reachable through visible controls in Home, Nearby, and Profile for manual inspection.

