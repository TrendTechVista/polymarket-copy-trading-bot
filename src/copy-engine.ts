import { getActivity, tradeEventKey } from "./data-api.js";
import { getTickSize, placeLimitOrder } from "./clob.js";
import { config } from "./config.js";
import { getCopyTarget } from "./target.js";

const SEEN_CAP = 10_000;
const seen = new Set<string>();

function trimSeen(): void {
  if (seen.size <= SEEN_CAP) return;
  const arr = [...seen];
  for (let i = 0; i < arr.length - SEEN_CAP; i++) seen.delete(arr[i]!);
}

function applySizeLimit(size: number, price: number): number {
  let s = size * config.sizeMultiplier;
  if (config.maxOrderUsd != null && config.maxOrderUsd > 0 && price > 0) {
    const notional = s * price;
    if (notional > config.maxOrderUsd) s = config.maxOrderUsd / price;
  }
  return Math.max(0.01, Math.round(s * 100) / 100);
}

export async function pollAndCopy(): Promise<{ fetched: number; copied: number; errors: string[] }> {
  const errors: string[] = [];
  const user = getCopyTarget() || config.targetUser;
  if (!user) return { fetched: 0, copied: 0, errors: ["No target user"] };

  const activities = await getActivity(config.dataApiUrl, {
    user,
    limit: config.activityLimit,
    offset: 0,
    type: config.copyTradesOnly ? "TRADE" : undefined,
    sortBy: "TIMESTAMP",
    sortDirection: "DESC",
  });

  let copied = 0;
  for (let i = activities.length - 1; i >= 0; i--) {
    const a = activities[i]!;
    if (a.type !== "TRADE" || !a.asset || !a.side) continue;

    const key = tradeEventKey(a);
    if (seen.has(key)) continue;
    seen.add(key);
    trimSeen();

    const price = a.price ?? 0;
    const size = a.size ?? 0;
    if (size < 0.01) continue;

    const tokenId = a.asset;
    const side = a.side;
    const orderSize = applySizeLimit(size, price);

    let tickSize = "0.01";
    try {
      tickSize = await getTickSize(tokenId);
    } catch (e) {
      errors.push(`tick ${tokenId}: ${e instanceof Error ? e.message : e}`);
    }

    if (config.dryRun) {
      console.log(`[DRY RUN] Would place ${side} ${orderSize} @ ${price} on ${tokenId} (tick=${tickSize})`);
      copied++;
      continue;
    }

    const result = await placeLimitOrder(tokenId, side, price, orderSize, tickSize, false);
    if (result.error) {
      errors.push(`${tokenId} ${side}: ${result.error}`);
    } else {
      console.log(`Copied: ${side} ${orderSize} @ ${price} token=${tokenId.slice(0, 10)}... orderID=${result.orderID ?? "ok"}`);
      copied++;
    }
  }

  return { fetched: activities.length, copied, errors };
}
