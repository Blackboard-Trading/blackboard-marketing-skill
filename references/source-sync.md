# Source sync record

- Snapshot date: 2026-10-25 (Asia/Ho_Chi_Minh).
- Source repository: `Blackboard-Trading/green-v2`.
- Source branch: `dev`.
- Source commit: `7c9b0b8`.
- Frontend style guide: `frontend/DESIGN.md`.
- Included frontend paths: `frontend/src/components/`, `frontend/src/styles/`, `frontend/src/assets/`, `frontend/public/social/`, and `frontend/public/favicon.svg`.
- Product mechanics reviewed from: `config/networks/*.json`, `contracts/src/core/TradingEngine.sol`, `contracts/src/core/CollateralVault.sol`, `contracts/src/libs/PapertradeMath.sol`, `contracts/src/libs/SettlementPolicy.sol`, `contracts/src/staking/StakingRewards.sol`, `contracts/src/redemption/EpochRedemption.sol`, `backend/src/shared/papertrade-math.ts`, `backend/src/api/pricing.ts`, `frontend/src/lib/config.ts`, `frontend/src/lib/math.ts`, `frontend/src/lib/staking-lock.ts`, and relevant Trade, Staking, and House frontend pages.

## Refresh procedure

1. Compare the source repository's latest commit and branch with this record.
2. Re-copy the listed frontend directories as a complete snapshot, preserving paths. Do not copy `.env*`, `.runtime/`, deployments, chain state, databases, build output, or dependency directories.
3. Re-read network market lists and served deployment config. Distinguish configured markets from the broader product roadmap. Confirm any new US equity symbol has price source, trading engine configuration, session rules, and risk parameters before changing claims.
4. Re-check staking lock/decay/reward logic, House accounting, impact parameters, liquidation rules, and redemption schedule against deployed versions and current config. Update the product reference and examples together.
5. Update this record, asset catalog, and any affected skill guidance. Review the public diff for secrets and private operational data before publishing.

The social method reference is [Corey Haines's social skill](https://github.com/coreyhaines31/marketingskills/blob/main/skills/social/SKILL.md), consulted on 2026-10-25. This bundle uses its broad content-planning and platform-adaptation ideas without copying its text.
