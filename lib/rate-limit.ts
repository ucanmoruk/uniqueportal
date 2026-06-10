/**
 * Basit in-memory sliding-window rate limiter.
 *
 * Not: Tek instance (self-host / tek Node süreci) için yeterlidir. Çok-instance
 * (yatay ölçek) bir dağıtımda paylaşımlı bir store (Redis vb.) gerekir; o zaman
 * `hit()` implementasyonu oraya taşınmalı. Arayüz aynı kalır.
 */

interface Bucket {
  count: number;
  resetAt: number;
}

declare global {
  // Hot-reload'da Map'in sıfırlanmaması için global'de tut
  var __rateLimitStore: Map<string, Bucket> | undefined;
}

const store: Map<string, Bucket> =
  globalThis.__rateLimitStore ?? (globalThis.__rateLimitStore = new Map());

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  /** Limit aşıldıysa kaç saniye sonra tekrar denenebilir */
  retryAfterSec: number;
}

/**
 * @param key      Sınırlanacak kimlik (örn. `login:<ip>:<kod>`)
 * @param limit    Pencere başına izin verilen istek sayısı
 * @param windowMs Pencere süresi (ms)
 */
export function hit(
  key: string,
  limit: number,
  windowMs: number,
  now = Date.now()
): RateLimitResult {
  const b = store.get(key);

  if (!b || now >= b.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: limit - 1, retryAfterSec: 0 };
  }

  if (b.count >= limit) {
    return {
      ok: false,
      remaining: 0,
      retryAfterSec: Math.max(1, Math.ceil((b.resetAt - now) / 1000)),
    };
  }

  b.count += 1;
  return { ok: true, remaining: limit - b.count, retryAfterSec: 0 };
}

/** Başarılı işlem sonrası sayacı sıfırlamak için (örn. başarılı login). */
export function reset(key: string): void {
  store.delete(key);
}

/** İstek başlıklarından istemci IP'sini çıkarır (proxy zinciri dahil). */
export function clientIpFromHeaders(h: Headers): string {
  const xff = h.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]!.trim();
  return h.get("x-real-ip") ?? "unknown";
}
