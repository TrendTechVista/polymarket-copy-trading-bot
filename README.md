# Polymarket Copy Trading Bot

TypeScript/Node.js bot that copies a target trader’s Polymarket activity: polls their public activity, then places limit orders on your account (same market, configurable size).

## Requirements

- Node.js 20+
- Polymarket account and API credentials (for live trading)
- Target: Polymarket **username** or **proxy wallet address** (0x…)

## Setup

```bash
cd Polymarket-Copy-Trading-Bot
npm install
cp .env.example .env
# Edit .env: COPY_TARGET_USER or COPY_TARGET_PROXY, keys, FUNDER_ADDRESS
```

## Config (.env)

| Variable | Description |
|----------|-------------|
| `COPY_TARGET_USER` | Username to copy (e.g. `alice`). Resolved to proxy via profile page. |
| `COPY_TARGET_PROXY` | Or set proxy address directly (`0x...`). |
| `COPY_POLL_INTERVAL_MS` | Poll Data API every N ms (default 15000). |
| `COPY_ACTIVITY_LIMIT` | Trades per poll (default 100, max 500). |
| `COPY_SIZE_MULTIPLIER` | Multiply copied size (1 = same, 0.5 = half). |
| `COPY_MAX_ORDER_USD` | Cap notional per order (0 = no cap). |
| `COPY_DRY_RUN` | `true`: only log, no orders. |
| `POLYMARKET_PRIVATE_KEY` | Wallet private key (0x + 64 hex). |
| `POLYMARKET_FUNDER_ADDRESS` | Your Polymarket proxy/funder address. |
| `POLYMARKET_API_KEY`, `POLYMARKET_API_SECRET`, `POLYMARKET_API_PASSPHRASE` | Optional. If empty, the bot derives API creds via `createOrDeriveApiKey()` (set `POLYMARKET_AUTO_DERIVE_API_KEY=true`, default). |

## Run

```bash
# Dry run (no real orders)
COPY_DRY_RUN=true npm run dev

# Live (load .env yourself or use dotenv)
npm run dev
# or
node --env-file=.env dist/index.js
```

## Flow

1. Resolve target: if `COPY_TARGET_USER` is not 0x, fetch `https://polymarket.com/@{user}` and read `__NEXT_DATA__.props.pageProps.proxyAddress`.
2. Every `COPY_POLL_INTERVAL_MS`: GET `https://data-api.polymarket.com/activity?user={proxy}&type=TRADE&limit=...&sortDirection=DESC`.
3. For each new TRADE (deduped by tx+asset+side): get token tick size from CLOB, apply size multiplier/cap, place limit order via `@polymarket/clob-client`.

## Disclaimer

Use at your own risk. Copying others’ trades can lose money. Prefer `COPY_DRY_RUN=true` until you are satisfied with behavior.
