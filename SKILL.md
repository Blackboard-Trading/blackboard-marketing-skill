---
name: blackboard-marketing
description: Create, adapt, and review Blackboard social posts and image concepts using the product's current mechanics, configured crypto and US equity markets, and bundled frontend visual assets. Use for social copy, threads, carousels, campaign calendars, product explainers, image generation, and asset selection for Blackboard.
---

# Blackboard marketing

Help the marketing team make accurate social content that looks and sounds like the Blackboard app. Deliver platform-ready drafts and image directions, grounded in the current product configuration and the bundled frontend assets.

## Workflow

1. Read [product mechanics](references/product-mechanics.md), [visual system](references/visual-system.md), and [asset catalog](references/asset-catalog.md) for product, style, or image work. Read [social playbook](references/social-playbook.md) for social copy.
2. Check the latest source sync record in [source sync](references/source-sync.md). If a newer frontend or contract snapshot is available in the working repository, inspect it before making claims or selecting changed assets. Treat current deployment configuration and live product state as authoritative for availability and mutable numbers.
3. Identify goal, audience, platform, desired action, language, and the claim/date being promoted from the brief or available marketing context. Ask only for missing facts that could change the copy. If the user wants a quick draft, state reasonable assumptions and proceed.
4. Create a standalone draft for each platform. Adapt the format and opening to the platform instead of copying identical text everywhere. Give each post one clear point and a concrete next action when appropriate.
5. For image work, select bundled assets as visual references. Use image generation when the user asks for a new image or the concept needs original art. For factual charts, interface screens, token amounts, market prices, or app states, use supplied source assets or a current screenshot; never invent product data in generated art. Add exact copy and data as a deliberate layout layer after generation when needed.
6. Review every deliverable against the accuracy and visual checks below. Return the copy, image prompt or asset paths, platform, intended audience, assumptions, and any facts that need a live check.

## Product accuracy rules

- Distinguish live product capabilities from target positioning, testnet/fixture behavior, and concepts. Markets come from the selected network's current configuration. This snapshot has BTC markets on test/UAT configs, BTC and ETH in the local fixture, and no configured US equity symbols. Do not claim US stocks are live until a current deployment config and trading path confirm them.
- Blackboard's trading model in this snapshot is price exposure through long/short positions with collateral and leverage. Do not describe it as buying, holding, or owning the underlying asset or share.
- Do not promise profit, cashback, token appreciation, guaranteed redemption value, execution price, or uninterrupted availability. Explain uncertainty and risk plainly when relevant.
- Prices, house values, staking balances, and other financial data are never inferred as zero when unavailable or stale. Use a current approved source or omit the number.
- Use `$CHALK` for the displayed token symbol. Use the app's exact names and distinguish a preview/indicative mark from an executed or on-chain result.
- Before publishing a parameter, yield, market list, schedule, chain, or deployment claim, verify its current source and environment. The code has distinct defaults and UAT overrides; a constant is not proof of the live value.

## Social content

- Prefer specific product behavior, a real user question, a verified observation, or a concrete lesson over generic market commentary.
- Lead with one useful idea. Keep the writing natural and concise, with paragraphs that read well on the chosen platform.
- Avoid canned hype, fabricated personal stories, engagement bait, emoji-led bullet lists, and formulaic contrast reveals. See the social playbook for the complete writing checklist.
- For threads and carousels, build a sequence: context, explanation, evidence/example, practical implication, and a relevant close. Every post or slide should make sense on its own if separated from the sequence.
- Confirm current platform limits and publishing features from the platform's official source when exact character limits, formats, or scheduling behavior matter.
- Produce drafts by default. Never schedule or publish without explicit instruction for that specific publishing action.

## Image creation

- Use Blackboard's dark board, chalk-white typography, restrained chalk-yellow emphasis, and clear financial-data hierarchy. Green means positive/long/profit and red means negative/short/loss; do not use these as decoration.
- Reuse the bundled logo/iconography, token assets, typography, CSS tokens, and social images. Preserve provided marks and symbols without redrawing or altering them.
- Generated visuals can be atmospheric, illustrative, or conceptual. Never ask an image model to fabricate readable interface text, numerical performance, prices, charts presented as real, product screens, user balances, or logos. Overlay verified text/data in a separate design step.
- Keep contrast high, layouts legible on mobile, and key content away from platform UI overlays. Provide a square, portrait, or landscape composition only after considering the platform and placement.
- Return the prompt, the bundled references used, intended aspect ratio, any exact overlay copy, and a short note identifying illustrative elements.

## Final review

Check that each deliverable:

- matches the current market/network status and mechanism;
- separates facts, estimates, and illustrative visuals;
- includes no unsupported return, safety, or availability claim;
- uses the app's names, colors, tokens, and supplied assets consistently;
- reads naturally aloud and has no generic AI-style filler;
- is understandable without hidden context; and
- has a clear next action only when one serves the reader.

## References

- [Social playbook](references/social-playbook.md)
- [Product mechanics and math](references/product-mechanics.md)
- [Visual system](references/visual-system.md)
- [Asset catalog](references/asset-catalog.md)
- [Source sync record](references/source-sync.md)
