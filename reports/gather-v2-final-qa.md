# Gather V2 Final QA

## Automated Validation

- `npx tsc --noEmit`: passed.
- `npm run lint`: passed with 16 existing Fast Refresh warnings and 0 errors.
- `npm run build`: passed.
- `npm run test:gather`: 21 passed across 360, 390, and 430 mobile Chromium projects.
- `npm run test:gather:visual`: 12 passed across 360, 390, and 430 mobile Chromium projects.

## Mobile Visual QA

Mobile visual QA is complete at 360, 390, and 430 px. Screenshots are stored in `reports/gather-v2-visual/`.

Inspected states:

- Gather list
- Gather new step 1 content/place
- Gather new step 2 co-host selection
- Gather new step 2 invite audience
- Gather new step 3 duration
- Gather new step 4 privacy preview
- Detail owner
- Detail co-host
- Detail invitee
- Manage Gather
- Expired Gather
- Notifications

Visual acceptance:

- No horizontal overflow.
- No clipped Vietnamese text found in inspected states.
- Long group names wrap inside cards.
- Selected chips remain readable.
- Co-host and invitee concepts are visually separate.
- Pending co-host states are understandable.
- CTAs remain reachable above bottom navigation.
- Long lists scroll.
- 360px remains usable.
- 430px remains compact and aligned with the Fendee visual system.

## Functional Flow Coverage

1. Create alone -> invite all friends -> publish: passed.
2. Create alone -> selected friends -> publish: covered by wizard and audience flows.
3. Create with one friend -> friend accepts co-host -> both appear as hosts: passed.
4. Create with group -> multiple co-host invites -> some accept -> some decline: represented in seeded QA state and manage view.
5. Invite one friend group: covered.
6. Invite multiple groups: covered.
7. Invite group + selected friends -> deduplication works: passed.
8. Co-host invitation and attendee invitation overlap: covered by separate host/invite records.
9. Blocked user is excluded: passed; `baongoc` is filtered from resolved recipients.
10. Owner edits active Gather: permission rules allow owner edit actions.
11. Co-host edits allowed fields: permission rules allow accepted co-host edits.
12. Co-host attempts owner-only action -> denied: passed through domain permission and UI route checks.
13. Invitee changes RSVP going -> maybe -> withdrawn/declined: passed.
14. Gather expires: passed.
15. Owner ends Gather early: passed.
16. Reload application -> local Gather state remains consistent: passed.

## Fixes From QA

- Added Playwright Test configuration and mobile Chromium projects.
- Added focused Gather functional and visual QA specs.
- Added stable QA selectors to Gather V2 controls.
- Fixed `/gather/$id/manage` routing by using the correct TanStack route file pattern.
- Fixed the manage page return link to route back to detail.
- Hardened stored Gather state loading so malformed or older localStorage state falls back safely.
- Fixed Gather store persistence so saved localStorage is hydrated after mount and not overwritten by SSR fallback state.
- Adjusted screenshot capture so long full-page screenshots do not show sticky-header overlay artifacts.

## Residual Notes

- `npm run lint` still reports existing `react-refresh/only-export-components` warnings in shared UI/store modules.
- Playwright dev-server output still includes React hydration warnings in seeded localStorage scenarios, mainly root theme attributes and mock seeded data versus SSR fallback markup. The warnings did not block functional behavior, visual QA, build, typecheck, or lint.
