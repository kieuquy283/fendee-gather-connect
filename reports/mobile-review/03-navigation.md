# Mobile Review 03 - Navigation

## Current Routes

Routes are file-based TanStack routes under `src/routes`. Primary mobile tabs are Home, Nearby, Gather, Tram, Chat, and Profile.

## Findings

- No route-level authentication or authorization guards were found.
- Invalid profile/chat/Gather IDs use `notFound` or local empty states in some routes.
- Gather manage route checks domain permissions for actions, but direct route access still renders the management surface with disabled actions.
- Bottom navigation has six destinations plus a central create action; this is crowded for 320 px and future native tab bars.
- Root metadata still says "Lovable App" rather than Fendee.

## Production Requirements

- Add route guards for authenticated app surfaces.
- Add server-backed resource visibility checks for profile, chat, Gather, notifications, friend requests, and block/report views.
- Define deep-link policy for invalid, expired, private, or blocked resources.

