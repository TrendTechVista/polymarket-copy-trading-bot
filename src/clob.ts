import { ClobClient, Side, OrderType } from "@polymarket/clob-client";
import { Wallet } from "ethers";
import { config } from "./config.js";

const VALID_TICK_SIZES = ["0.1", "0.01", "0.001", "0.0001"] as const;
type TickSize = (typeof VALID_TICK_SIZES)[number];

function toTickSize(s: string): TickSize {
  const v = s.trim();
  if (VALID_TICK_SIZES.includes(v as TickSize)) return v as TickSize;
  return "0.01";
}

let client: ClobClient | null = null;
let clientPromise: Promise<ClobClient> | null = null;

function getSigner(): Wallet {
  return new Wallet(config.privateKey);
}

function getApiCreds(): { key: string; secret: string; passphrase: string } | null {
  if (config.apiKey && config.apiSecret && config.apiPassphrase)
    return { key: config.apiKey, secret: config.apiSecret, passphrase: config.apiPassphrase };
  return null;
}

/** Returns CLOB client; if API creds are missing and autoDeriveApiKey is true, derives them via createOrDeriveApiKey(). */
export async function getClobClient(): Promise<ClobClient> {
  if (client) return client;
  if (clientPromise) return clientPromise;
  clientPromise = (async () => {
    const signer = getSigner();
    let creds = getApiCreds();
    if (!creds && config.autoDeriveApiKey && !config.dryRun) {
      const authOnly = new ClobClient(
        config.clobUrl,
        config.chainId,
        signer as unknown as import("@ethersproject/wallet").Wallet,
        undefined,
        config.signatureType,
        config.funderAddress,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        true
      );
      creds = await authOnly.createOrDeriveApiKey();
      console.log("Derived API key (key=%s...)", (creds!.key ?? "").slice(0, 8));
    }
    if (!creds) throw new Error("No API creds: set POLYMARKET_API_KEY/SECRET/PASSPHRASE or POLYMARKET_AUTO_DERIVE_API_KEY=true");
    client = new ClobClient(
      config.clobUrl,
      config.chainId,
      signer as unknown as import("@ethersproject/wallet").Wallet,
      creds,
      config.signatureType,
      config.funderAddress,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      true
    );
    return client;
  })();
  return clientPromise;
}

export interface OrderBookSummary {
  tick_size: string;
  bids: [string, string][];
  asks: [string, string][];
  min_order_size?: string;
  neg_risk?: boolean;
}

export async function getOrderBook(tokenId: string): Promise<OrderBookSummary | null> {
  const c = new ClobClient(config.clobUrl, config.chainId);
  try {
    const book = await c.getOrderBook(tokenId);
    return book as unknown as OrderBookSummary;
  } catch {
    return null;
  }
}

export async function getTickSize(tokenId: string): Promise<string> {
  const book = await getOrderBook(tokenId);
  if (book?.tick_size) return toTickSize(book.tick_size);
  return "0.01";
}

export async function placeLimitOrder(
  tokenId: string,
  side: "BUY" | "SELL",
  price: number,
  size: number,
  tickSize: string,
  negRisk: boolean = false
): Promise<{ orderID?: string; error?: string }> {
  const clob = await getClobClient();
  const sideEnum = side === "BUY" ? Side.BUY : Side.SELL;
  const roundedPrice = roundToTick(price, parseFloat(tickSize));
  const roundedSize = Math.max(0.01, Math.round(size * 100) / 100);

  try {
    const res = await clob.createAndPostOrder(
      {
        tokenID: tokenId,
        price: roundedPrice,
        size: roundedSize,
        side: sideEnum,
      },
      { tickSize: toTickSize(tickSize), negRisk },
      OrderType.GTC
    );
    return { orderID: (res as { orderID?: string })?.orderID ?? (res as { id?: string })?.id };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { error: msg };
  }
}

export async function placeMarketOrder(
  tokenId: string,
  side: "BUY" | "SELL",
  amount: number,
  tickSize: string,
  negRisk: boolean = false
): Promise<{ orderID?: string; error?: string }> {
  const clob = await getClobClient();
  const sideEnum = side === "BUY" ? Side.BUY : Side.SELL;
  const roundedAmount = Math.max(0.01, Math.round(amount * 100) / 100);

  try {
    const res = await clob.createAndPostMarketOrder(
      {
        tokenID: tokenId,
        amount: roundedAmount,
        side: sideEnum,
      },
      { tickSize: toTickSize(tickSize), negRisk }
    );
    return { orderID: (res as { orderID?: string })?.orderID ?? (res as { id?: string })?.id };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { error: msg };
  }
}

function roundToTick(value: number, tickSize: number): number {
  if (tickSize <= 0) return value;
  const ticks = Math.round(value / tickSize);
  return Math.max(0.0001, Math.min(0.9999, ticks * tickSize));
}
