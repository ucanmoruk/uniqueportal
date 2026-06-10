/**
 * Kullanıcıya gösterilecek hata mesajını güvenli biçimde üretir.
 *
 * Production'da ham hata metni (DB şema adları, SQL hataları, stack ipuçları)
 * KULLANICIYA SIZMAZ — yalnızca jenerik `fallback` döner. Geliştirmede ise
 * teşhis için detay eklenir. Ham hata her durumda sunucu loguna yazılır.
 */
export function userMessage(err: unknown, fallback: string): string {
  // Sunucu tarafı log — her ortamda
  console.error("[error]", err);

  if (process.env.NODE_ENV === "production") {
    return fallback;
  }
  const detail = err instanceof Error ? err.message : String(err);
  return `${fallback} (${detail})`;
}
