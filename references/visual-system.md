# Visual system

The source is `frontend/DESIGN.md` from the snapshot in [source-sync.md](source-sync.md). The matching frontend tokens, styles, components, and visual assets are bundled under `assets/blackboard-frontend/`.

## Blackboard look

- Dark chalkboard trading terminal; dark surfaces with thin structural lines and compact, information-dense panels.
- Lato for interface and data, Cabin Sketch for brand/display headlines, JetBrains Mono for addresses and transaction hashes, Patrick Hand for chalk notes/lessons.
- Chalk yellow is the main action and active navigation accent. Green and red have data meaning only: positive/long/profit and negative/short/loss.
- Chalk-white text, thin grid lines, tight spacing, small radii, and restrained chalk marks. Keep the data hierarchy clear and avoid glossy gradients, neon, generic crypto coins, and decorative green/red.
- Respect the contrast and spacing in the supplied components. Do not redraw the Blackboard wordmark or replace supplied marks with generated approximations.

## Responsive use

Design social graphics for their actual placement and inspect the safe area at mobile scale. App breakpoints are 760px and 1023px; check 375px, about 820px, and about 1440px when a design is intended to resemble the product UI. Keep platform overlays clear of the headline, chart annotations, and CTA.

## Truthful UI art

The source bundle is a snapshot, not a live UI. Use a current, approved screenshot for claims about available markets, price, balances, network, or product state. Use bundled components to reproduce the style in conceptual mockups, but label non-live screens as illustrative. Do not render fake transactions or financial values as actual user/account data.

## Source design tokens

Use the values in `assets/blackboard-frontend/styles/redesign/tokens.css` rather than inventing hex values. The corresponding components are in `assets/blackboard-frontend/components/primitives/`; CSS is in `styles/redesign/components.css` and area styles. Older styles are included for reference but the redesign styles are the current UI system in this snapshot.
