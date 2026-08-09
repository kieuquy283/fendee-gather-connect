# Mobile Review 08 - Privacy

## Sensitive Data Inventory

| Data Type | Collection | Storage | Visibility | Revocation/Deletion |
|---|---|---|---|---|
| Location/presence | Prototype simulated | localStorage approximate zones | Nearby/friends UI | Local stop only |
| Profile/name/avatar/bio | Static mock | Source bundle | Public routes | Not implemented |
| Give & Need/interests | Static mock | Source bundle | Profile/Nearby | Not implemented |
| Friend graph/groups | Static mock | Source bundle | App UI | Not implemented |
| Gather hosts/invites/RSVP | Local mutation | localStorage | App UI | Expire/end local only |
| Notifications | Static/local | Source/localStorage | Notifications route | No push consent controls |
| Messages | Static mock | Source bundle | Chat routes | Not implemented |
| Blocks/reports | Component state/no-op | In memory only | Current route only | Not enforced |

## Findings

- There is no privacy policy enforcement layer.
- There is no server-side deletion, retention, export, or revocation contract.
- Block/report state is not durable and does not filter other product surfaces.
- Prototype avatars use `i.pravatar.cc`, which leaks image fetches to a third party.
- `robots.txt` allows crawling all paths; private prototype routes are not excluded.

## Readiness

NOT READY for production handling of personal, social, location, or messaging data.

