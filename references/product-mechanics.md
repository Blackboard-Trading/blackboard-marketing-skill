# Blackboard product mechanics

This is a marketing reference, not a substitute for current deployment state. It summarizes the repository snapshot recorded in [source-sync.md](source-sync.md). Check the selected environment's served config and on-chain settings before publishing mutable figures.

## Product and markets

Blackboard presents a trading interface for leveraged long/short positions against configured market prices. In this repository snapshot, network config lists BTC for Robinhood testnet and UAT, BTC and ETH for the isolated local fixture, and BTC for local mainnet-price fixtures. No US equity symbols are configured here. The product may intend to support crypto and US stocks, but only describe a symbol as available after confirming it is in the selected deployment's enabled markets and supported by the live pricing/execution path.

Call this price exposure or a position. Do not imply the trader owns the referenced crypto or stock. A US equity market should be described as a configured market only after checking its symbol, session behavior, oracle freshness, execution, and risk parameters in the current deployment.

## Position PnL, impact haircut, and liquidation

The contract uses market-specific impact parameters. For margin `M`, leverage `L`, entry price `E`, and effective exit `X`, the raw linear PnL is:

`raw = M × L × (X − E) / E` for a long, and `M × L × (E − X) / E` for a short.

For a favorable move, the implementation first shaves a deadband of `E / 50,000` from the favorable exit move, then scales positive raw profit by an asymmetric impact factor. In WAD notation, with `move = abs(X − E) / E` and market parameters `baseRate`, `rateMultiplier`, `positionMultiplier`, and `referenceNotional`:

`scale = (1 − baseRate) / (1 + 1/(move × rateMultiplier) + referenceNotional/(1,000,000 × move × positionMultiplier))`

`adjusted profit = raw profit × scale`

The actual implementation uses fixed-precision integer arithmetic and truncation. Do not calculate marketing examples from the simplified formula when exact results matter; use the current contract/client quote with its active market parameters. Losses are not multiplied by the profit haircut and are capped at posted margin in settlement. A 2% discount is applied to positive adjusted PnL. This impact adjustment is not an exchange slippage promise or a market execution guarantee.

The hard bust trigger is about 4.8 basis points inside the zero-equity price. Contract formulas are:

- Long: `entry × (L − 1) × 100,048 / (L × 100,000)`
- Short: `entry × (L + 1) × 99,952 / (L × 100,000)`

At the trigger, the position is liquidatable and the full margin is treated as the gross loss. Avoid portraying a displayed indicative mark as an execution or liquidation event.

## Settlement and the House

Collateral is held by the Vault and divided into accounting buckets. The House is not a guaranteed external liquidity provider. Open House PnL is an estimate of how the open book would affect it if positions closed at the sampled marks. Queue debt represents unpaid wins.

- **Losing close:** gross loss increases House cash, less any collected fee. If there is no outstanding win debt, a 2% fee is collected and split half to staking and half to the operator. When debt exists, the loss is retained for that debt and some queue entries are harvested FIFO.
- **Liquidation:** full posted margin is the gross loss in the current settlement policy.
- **Winning close:** positive adjusted PnL receives the 2% discount. If the House can pay and has no outstanding debt, the net amount is paid. Otherwise cash available is applied and the remainder is queued; queue order is FIFO.
- **House cap:** the reserve target has a $1,000,000 collateral floor in this contract version. The loss incentive depends on free House equity `max(House cash − queue debt, 0)` relative to the current reserve target. Trades, claims, and transfers do not automatically make every display metric equivalent to withdrawable liquidity.

The current loss mint formula in `SettlementPolicy` is:

`base tokens = gross loss × 10^12` (6-decimal collateral to 18-decimal token units)

`minted tokens = base tokens × (1 + mintBoost × (1 − clamp(free House equity / reserve target, 0, 1)))`

It is rounded down; the contract default `mintBoostBps = 5,000` makes the empty-House multiplier 1.5×. Owner-set values can change and are capped at 10,000 bps (2×). Referral minting is separate. Treat these as code defaults, not as a live guarantee.

## Staking

The bundled contract snapshot describes `$CHALK` staking with collateral rewards, an exponential decay index equivalent to a one-day half-life, and faded tokens burned. Conceptually, live stake is `shares × global decay index`; the per-second factor approximates `2^(-1 / 86,400)`. The index rebases every 30-day epoch, and account shares/reward debt are checkpointed across epochs. User actions catch up a bounded number of epochs; older accounts may need a checkpoint before principal and rewards are available.

The default lock is 24 hours. A top-up changes the aggregate unlock time using the post-decay current stake and incoming amount as weights: `new unlock = weighted average(old effective unlock, now + lock duration)`. If the configured new lock is shorter than the remaining lock, the aggregate lock moves toward that shorter duration with rounding protection. The exact formula is in `StakingRewards._stake`; verify the deployed `lockDuration` before describing it. Reward distribution is blocked while win-queue debt exists and is rate-limited by the Vault. Staking rewards are paid from a Vault module account.

Staking account values can be unavailable while the user needs to checkpoint older epochs. Never convert an unavailable or checkpoint-required value to zero. Avoid calling a displayed rate an APY unless a current, supported calculation and time basis are provided.

## Redemption epochs

Redemption is a one-way commitment of `$CHALK` to the currently open epoch. The user later claims a proportional share of that epoch's funded reward pot after close and finalization. The amount is not a fixed token redemption price.

At finalization the Vault provisions queue debt first. If at least one user redeemed, 80% of the residual is assigned to redeemers and 10% to the operator; the remaining 10% stays in the House. A user's share is `their redeemed amount / total redeemed × reward pot`, rounded down. If nobody redeems, the contract does not allocate the 80/10 split for that epoch.

Contract defaults are 14-day epochs and a 48-hour redemption window, but values are configurable. The UAT network JSON in this snapshot overrides these to 2 hours and 30 minutes. Always report the exact active network schedule, its time zone, and the source timestamp. Delayed finalization can skip elapsed epoch ids; never invent a payout date from the default alone.

## Safe language

Prefer “indicative mark,” “estimated PnL,” “configured market,” “reward pot,” “queue,” and “subject to current deployment settings.” Avoid “guaranteed payout,” “risk-free,” “owns shares/coins,” “fixed redemption price,” “always liquid,” and unsourced APY or yield.
