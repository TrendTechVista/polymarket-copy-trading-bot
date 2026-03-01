const DEFAULT_LIMIT = 100;
const MAX_LIMIT = 500;

export type ActivityType = "TRADE" | "SPLIT" | "MERGE" | "REDEEM" | "REWARD" | "CONVERSION" | "MAKER_REBATE";

export interface Activity {
  proxyWallet?: string;
  timestamp: number;
  conditionId?: string;
  type: ActivityType;
  size?: number;
  usdcSize?: number;
  transactionHash?: string;
  price?: number;
  asset?: string;
  side?: "BUY" | "SELL";
  outcomeIndex?: number;
  title?: string;
  slug?: string;
  eventSlug?: string;
  outcome?: string;
}

export interface GetActivityParams {
  user: string;
  limit?: number;
  offset?: number;
  type?: ActivityType | ActivityType[];
  sortBy?: "TIMESTAMP" | "TOKENS" | "CASH";
  sortDirection?: "ASC" | "DESC";
}

export function buildActivityUrl(base: string, params: GetActivityParams): string {
  const u = new URL(`${base}/activity`);
  u.searchParams.set("user", params.user);
  u.searchParams.set("limit", String(Math.min(MAX_LIMIT, params.limit ?? DEFAULT_LIMIT)));
  u.searchParams.set("offset", String(Math.max(0, params.offset ?? 0)));
  if (params.type) {
    const t = Array.isArray(params.type) ? params.type : [params.type];
    u.searchParams.set("type", t.join(","));
  }
  if (params.sortBy) u.searchParams.set("sortBy", params.sortBy);
  if (params.sortDirection) u.searchParams.set("sortDirection", params.sortDirection);
  return u.toString();
}

export async function getActivity(base: string, params: GetActivityParams): Promise<Activity[]> {
  const url = buildActivityUrl(base, params);
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`Data API activity ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

export function tradeEventKey(a: Activity): string {
  const tx = a.transactionHash ?? "";
  const asset = a.asset ?? "";
  const side = a.side ?? "";
  const ts = a.timestamp ?? 0;
  if (tx) return `${tx}:${asset}:${side}`;
  return `:${ts}:${asset}:${side}`;
}
