# Mobile Review 15 - Accessibility

## Target

WCAG 2.2 AA where applicable.

## Positive Findings

- Many icon-only controls have `aria-label`.
- Form fields commonly use `Label` with `htmlFor`.
- Radix primitives provide a baseline for dialogs/sheets.
- Buttons use native button elements in many custom selectors.

## Gaps

- No automated accessibility tests were found.
- No keyboard/focus traversal audit exists for sheets, dialogs, bottom nav, Gather wizard, Nearby markers, or chat composer.
- No contrast report exists for OKLCH token combinations.
- Heading hierarchy is not systematically validated.
- Dynamic status changes such as Presence Starting, Moving, expired Gather, and RSVP updates are not announced through live regions.
- Several chips/toggled cards rely heavily on color and small text.
- Target sizes at 320 px and large-text settings are not verified.

## Readiness

NOT READY for WCAG 2.2 AA claim.

