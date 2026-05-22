import type { SessionUser } from "@/types/db";

export type ScopeMode = "musteri-proje" | "plasiyer" | "firmakodu" | "firmaid";

export interface ScopedWhere {
  clause: string;
  params: Record<string, string | number | null>;
}

const TRUE: ScopedWhere = { clause: "1 = 1", params: {} };
const NONE: ScopedWhere = { clause: "1 = 0", params: {} };

export function isAdmin(user: SessionUser | null | undefined): boolean {
  return user?.tur === "Admin";
}

/**
 * Bir firma için VIEW üzerinde kapsam filtresi üretir.
 *
 * Hedef VIEW'a göre `mode` seçilmeli:
 *  - "musteri-proje": VIEW'da "Müşteri" ve "Proje" sütunları var
 *  - "firmakodu":      VIEW'da "FirmaKodu" sütunu var (örn. VIEW_TALEP_LISTE)
 *  - "firmaid":        VIEW'da "FaturaFirmaID" / "FirmaID" sütunu var
 *  - "plasiyer":       Yalnızca PlasiyerID
 *
 * Plasiyer rolü için, görünür VIEW'da PlasiyerID varsa otomatik onunla
 * birleştirilir.
 */
export function scopeByFirma(
  user: SessionUser,
  mode: ScopeMode = "musteri-proje"
): ScopedWhere {
  if (isAdmin(user)) return TRUE;

  if (user.tur === "Plasiyer") {
    if (user.plasiyerId == null) return NONE;
    return {
      clause: "PlasiyerID = @scope_plasiyer",
      params: { scope_plasiyer: user.plasiyerId },
    };
  }

  if (mode === "firmakodu") {
    if (!user.kod) return NONE;
    return {
      clause: "FirmaKodu = @scope_kod",
      params: { scope_kod: user.kod },
    };
  }

  if (mode === "firmaid") {
    return {
      clause: "FaturaFirmaID = @scope_firma_id",
      params: { scope_firma_id: user.id },
    };
  }

  // musteri-proje (varsayılan)
  if (!user.firmaAdi) return NONE;
  if (user.tur === "Proje") {
    return {
      clause: '(Proje = @scope_firma OR [Müşteri] = @scope_firma)',
      params: { scope_firma: user.firmaAdi },
    };
  }
  // Müşteri / diğer
  return {
    clause: '[Müşteri] = @scope_firma',
    params: { scope_firma: user.firmaAdi },
  };
}
