const env = process.env;

export const config = {
  /** Target to copy: Polymarket proxy (0x) or username (resolved to proxy at startup) */
  targetUser: (env.COPY_TARGET_USER ?? env.COPY_TARGET_PROXY ?? "").trim(),
  /** Poll interval for target activity (ms) */
  pollIntervalMs: Math.max(5_000, parseInt(env.COPY_POLL_INTERVAL_MS ?? "15000", 10)),
  /** Max number of trades to consider per poll (Data API limit 500) */
  activityLimit: Math.min(500, Math.max(10, parseInt(env.COPY_ACTIVITY_LIMIT ?? "100", 10))),
  /** Size multiplier for copied orders (1 = same size, 0.5 = half) */
  sizeMultiplier: Math.max(0.01, Math.min(10, parseFloat(env.COPY_SIZE_MULTIPLIER ?? "1"))),
  /** Max USDC notional per copied order (0 = no cap) */
  maxOrderUsd: parseFloat(env.COPY_MAX_ORDER_USD ?? "0") || null,
  /** Only copy TRADE type (ignore SPLIT/MERGE/etc) */
  copyTradesOnly: (env.COPY_TRADES_ONLY ?? "true").toLowerCase() === "true",
  /** Dry run: log would-be orders, do not place */
  dryRun: (env.COPY_DRY_RUN ?? "false").toLowerCase() === "true",

  /** Polymarket Data API base */
  dataApiUrl: (env.POLYMARKET_DATA_API_URL ?? "https://data-api.polymarket.com").replace(/\/$/, ""),
  /** CLOB REST base */
  clobUrl: (env.POLYMARKET_CLOB_URL ?? "https://clob.polymarket.com").replace(/\/$/, ""),
  /** Chain ID (137 = Polygon) */
  chainId: parseInt(env.POLYMARKET_CHAIN_ID ?? "137", 10),

  /** Wallet private key (0x + 64 hex) for signing orders */
  privateKey: (env.POLYMARKET_PRIVATE_KEY ?? "").trim(),
  /** Funder address (proxy wallet) */
  funderAddress: (env.POLYMARKET_FUNDER_ADDRESS ?? "").trim(),
  /** API key from Polymarket (derive via UI or API) */
  apiKey: (env.POLYMARKET_API_KEY ?? "").trim(),
  /** API secret */
  apiSecret: (env.POLYMARKET_API_SECRET ?? "").trim(),
  /** API passphrase */
  apiPassphrase: (env.POLYMARKET_API_PASSPHRASE ?? "").trim(),
  /** If true and API creds are empty, derive via createOrDeriveApiKey() (recommended) */
  autoDeriveApiKey: (env.POLYMARKET_AUTO_DERIVE_API_KEY ?? "true").toLowerCase() === "true",
  /** Signature type: 0 = EOA, 2 = Gnosis Safe */
  signatureType: parseInt(env.POLYMARKET_SIGNATURE_TYPE ?? "0", 10),
} as const;

export function validateConfig(): string | null {
  if (!config.targetUser) return "COPY_TARGET_USER or COPY_TARGET_PROXY required";
  if (!config.privateKey || !/^0x[a-fA-F0-9]{64}$/.test(config.privateKey)) return "POLYMARKET_PRIVATE_KEY must be 0x + 64 hex";
  if (!config.funderAddress || !/^0x[a-fA-F0-9]{40}$/.test(config.funderAddress)) return "POLYMARKET_FUNDER_ADDRESS required (0x + 40 hex)";
  const hasCreds = config.apiKey && config.apiSecret && config.apiPassphrase;
  if (!config.dryRun && !hasCreds && !config.autoDeriveApiKey)
    return "Set POLYMARKET_API_KEY/SECRET/PASSPHRASE or POLYMARKET_AUTO_DERIVE_API_KEY=true";
  return null;
}
