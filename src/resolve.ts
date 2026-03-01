const POLYMARKET_SITE = "https://polymarket.com";
const ADDRESS_REGEX = /^0x[a-fA-F0-9]{40}$/;
const NEXT_DATA_REGEX = /<script[^>]*id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/;

export function isProxyAddress(value: string): boolean {
  return ADDRESS_REGEX.test((value ?? "").trim());
}

export function normalizeUsername(u: string | undefined): string | null {
  if (u == null) return null;
  const s = u.trim();
  if (!s) return null;
  return s.startsWith("@") ? s.slice(1) : s;
}

/** Resolve Polymarket username to proxy address by scraping profile page. */
export async function resolveUsernameToProxy(username: string): Promise<string | null> {
  const sanitized = normalizeUsername(username);
  if (!sanitized) return null;

  const url = `${POLYMARKET_SITE}/@${sanitized}?tab=activity`;
  const res = await fetch(url, { headers: { "User-Agent": "PolymarketCopyBot/1.0" } });
  if (!res.ok) return null;

  const html = await res.text();
  const m = html.match(NEXT_DATA_REGEX);
  if (!m?.[1]) return null;

  try {
    const data = JSON.parse(m[1]) as { props?: { pageProps?: Record<string, unknown> } };
    const pageProps = data?.props?.pageProps as Record<string, string> | undefined;
    if (!pageProps) return null;

    const proxy = [pageProps.proxyAddress, pageProps.primaryAddress, pageProps.baseAddress]
      .filter(Boolean)
      .find((a) => typeof a === "string" && ADDRESS_REGEX.test(a));
    return proxy ?? null;
  } catch {
    return null;
  }
}
