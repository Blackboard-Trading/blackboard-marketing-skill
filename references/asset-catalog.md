# Bundled asset catalog

All files below are copied from the frontend snapshot listed in [source-sync.md](source-sync.md). Keep their source names and directory structure so the team can find them again. The files are a reference bundle; React components may require the app's providers, routing, API, and design tokens to run.

## What's included

- `assets/blackboard-frontend/components/` — all 52 current frontend component source files, including primitives, charts, trade UI, share cards, protocol/house panels, icon components, and empty/loading states.
- `assets/blackboard-frontend/styles/` — all current redesign and legacy CSS files; use `redesign/tokens.css`, `base.css`, `components.css`, and the area styles as the main reference.
- `assets/blackboard-frontend/assets/` — all 22 source icons/images for coins, navigation, chalk, trade actions, sharing, feeds, and wallet providers.
- `assets/blackboard-frontend/public/social/` — the two existing Blackboard social images for direct visual reference.
- `assets/blackboard-frontend/public/favicon.svg` — app favicon.

## Useful starting points

| Need | Reference |
| --- | --- |
| Design tokens | `styles/redesign/tokens.css` |
| Base type and utilities | `styles/redesign/base.css` |
| Buttons, cards, tables, states | `styles/redesign/components.css` and `components/primitives/` |
| Trade UI | `components/trade/`, `components/MarketMenu.tsx`, `styles/redesign/trade.css` |
| House/protocol UI | `components/`, `styles/redesign/protocol.css`, `styles/redesign/protocol-markets.css` |
| Share card rendering | `components/share/ShareCard.tsx`, `components/share/art.ts`, `styles/redesign/share.css` |
| Chalk lessons and icons | `components/ChalkLessons.tsx`, `components/ChalkDoodles.tsx`, `components/BbIcon.tsx`, `assets/icons/` |
| Existing social imagery | `public/social/` |

## Reuse notes

Use visual assets as Blackboard references inside marketing work. Provider wallet logos remain provider marks. Keep all third-party marks in their supplied context and do not imply endorsement. This public repository does not add an open-source license or change ownership of copied product assets.
