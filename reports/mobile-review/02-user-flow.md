# Mobile Review 02 - User Flow

## Flow Matrix

| Flow | Happy Path | Back/Cancel | Error | Permission Denied | Offline | Reload | Deep Link/Invalid |
|---|---|---|---|---|---|---|---|
| New user onboarding | UI only | Basic links | Not implemented | N/A | Not implemented | No session model | Routes open directly |
| Login/signup | UI only, no auth | Basic toggle | No validation beyond HTML types | N/A | Not implemented | No session | Protected routes not protected |
| Profile setup | UI only | Basic links | Minimal/no persistence | N/A | Not implemented | Not durable | Direct routes open |
| Friend creation/groups | Static mock | Limited | No real mutation failure | N/A | Not implemented | Not durable | No ownership checks |
| Enable presence | Prototype works | Stop sheet exists | Simulated failures | Simulated only | Simulated only | localStorage persists | No server session |
| Nearby move A -> hidden -> B | Prototype controls work | Stop works | Inaccurate state simulated | Simulated only | Simulated only | localStorage persists | Mock users only |
| Friend snapshot update | Prototype works | Confirmation sheet | No backend errors | N/A | Not implemented | localStorage persists | No recipient enforcement |
| Stop presence | Prototype clears local active state | Sheet cancel works | No backend error path | N/A | Local only | localStorage state may remain if external server existed | No server erasure |
| Create Gather alone/co-hosts | Gather V2 tested | Back works | Client validation | N/A | Not implemented | localStorage hardened | Direct private access not blocked server-side |
| Gather RSVP/manage/expire/end | Gather V2 tested | Basic | Permission API returns false | N/A | Not implemented | localStorage persists | Client-only authorization |
| Notifications | Mock/local shown | N/A | No delivery errors | N/A | Not implemented | Gather notifications persist | Deep links route to local IDs |
| Chat | Static thread UI | Back works | Send does not mutate | N/A | Not implemented | Not durable | Arbitrary chat id loads if in mock |
| Block/report | UI affordance | Dialog cancel | Report no-op | N/A | Not implemented | Profile block local component only | Not enforced |
| Profile privacy | Switches toggle locally | Back works | No save errors | N/A | Not implemented | Not durable | Not enforced |
| Logout/account deletion | NOT IMPLEMENTED | N/A | N/A | N/A | N/A | N/A | N/A |

## Main Finding

Gather V2 has the most complete user-flow handling. The rest of the product is largely high-fidelity prototype UI without real mutation, persistence, permissions, or failure recovery.

