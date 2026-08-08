# Gather V2 Mobile QA

## Scope

Mobile visual and interaction QA covered Gather V2 at:

- 360 x 800, deviceScaleFactor 3, Chromium
- 390 x 844, deviceScaleFactor 3, Chromium
- 430 x 932, deviceScaleFactor 3, Chromium

Screenshots are saved in `reports/gather-v2-visual/`.

## Validation Summary

| Viewport | Flow/state | Result | Defect | Fix | Final status |
| --- | --- | --- | --- | --- | --- |
| 360, 390, 430 | Gather list | Pass | None | None | Pass |
| 360, 390, 430 | Gather new step 1 | Pass | None | None | Pass |
| 360, 390, 430 | Gather new step 2 co-hosts | Pass | Screenshot helper initially showed sticky header over long full-page capture | Neutralized sticky positioning only during full-page screenshots | Pass |
| 360, 390, 430 | Gather new step 2 invite audience | Pass | Same full-page screenshot artifact | Same screenshot helper fix | Pass |
| 360, 390, 430 | Gather new step 3 duration | Pass | None | None | Pass |
| 360, 390, 430 | Gather new step 4 privacy preview | Pass | None | None | Pass |
| 360, 390, 430 | Detail owner | Pass | Manage route initially rendered detail because the route file was nested incorrectly | Renamed route to `/gather/$id_/manage` and fixed detail return link | Pass |
| 360, 390, 430 | Detail co-host | Pass | None | Added stable QA action selectors | Pass |
| 360, 390, 430 | Detail invitee RSVP | Pass | None | Added stable QA action selectors | Pass |
| 360, 390, 430 | Manage Gather | Pass | None | None | Pass |
| 360, 390, 430 | Expired Gather | Pass | None | None | Pass |
| 360, 390, 430 | Notifications | Pass | None | None | Pass |
| 360, 390, 430 | Audience dedupe | Pass | Test harness had broad selectors | Scoped selectors to co-host and invite sections | Pass |
| 360, 390, 430 | Persistence/reload/corrupted storage | Pass | Provider could overwrite saved localStorage during SSR hydration; test cleanup also cleared storage on reload | Hydrate Gather store from localStorage after mount, persist only after hydration, sanitize malformed stored state, and make test cleanup one-shot per test | Pass |

## Manual Visual Inspection

- No horizontal overflow at 360, 390, or 430.
- Vietnamese text is readable and not clipped in inspected list, creation, detail, manage, expired, and notification states.
- Long group names wrap inside their cards and selected chips stay within summary panels.
- Selected people and group chips remain readable at 360px.
- Co-host and invitee concepts are visually separated in Step 2 and Step 4.
- Pending co-host state is understandable in the privacy preview and manage view.
- Primary CTAs remain reachable above bottom navigation.
- Long lists scroll normally.
- Expired state removes active affordance and disables RSVP actions.
- 430px layout remains compact and does not stretch into a separate visual language.

## Screenshot Inventory

Required screenshots captured:

- `gather-list-360.png`
- `gather-list-390.png`
- `gather-list-430.png`
- `gather-new-step1-390.png`
- `gather-new-step2-cohosts-390.png`
- `gather-new-step2-audience-390.png`
- `gather-new-step3-390.png`
- `gather-new-step4-390.png`
- `gather-detail-owner-390.png`
- `gather-detail-cohost-390.png`
- `gather-detail-invitee-390.png`
- `gather-manage-390.png`
- `gather-expired-390.png`

Additional 360/430 state screenshots and notification screenshots were also captured.

## Final Validation

- `npx tsc --noEmit`: passed.
- `npm run lint`: passed with existing Fast Refresh warnings only.
- `npm run build`: passed.
- `npm run test:gather`: 21 passed.
- `npm run test:gather:visual`: 12 passed.

## Residual Notes

- Dev-server Playwright runs still log React hydration warnings, primarily around root theme attributes and seeded localStorage test data versus SSR fallback output. Functional, visual, build, type, and lint validation pass.
