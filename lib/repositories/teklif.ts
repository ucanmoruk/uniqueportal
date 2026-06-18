import { query, queryOne } from "@/lib/db-mysql";
import { isAdmin } from "@/lib/permissions";
import type { SessionUser } from "@/types/db";

const DRAFT_DURUMLAR = ["Taslak", "Hazırlanıyor", "Hazirlaniyor", "Draft"];

export interface TeklifListItem {
  ID: number;
  "Teklif No": string;
  Tarih: Date | null;
  Tur: string | null;
  "Müşteri": string | null;
  Proje: string | null;
  Aciklama: string | null;
  Durum: string | null;
}

interface RawListRow {
  ID: number;
  TeklifNoText: string;
  Tarih: Date | null;
  TeklifKonusu: string | null;
  MusteriAdi: string | null;
  Notlar: string | null;
  TeklifDurum: string | null;
}

function mapList(rows: RawListRow[]): TeklifListItem[] {
  return rows.map((r) => ({
    ID: r.ID,
    "Teklif No": r.TeklifNoText,
    Tarih: r.Tarih,
    Tur: r.TeklifKonusu,
    "Müşteri": r.MusteriAdi,
    Proje: null,
    Aciklama: r.Notlar,
    Durum: r.TeklifDurum,
  }));
}

const SELECT_LIST = `
  SELECT
    tb.ID,
    CONCAT(
      COALESCE(tb.DisTeklifKodu, CONCAT('UQ', tb.TeklifNo)),
      '/',
      LPAD(tb.RevNo, 2, '0')
    ) AS TeklifNoText,
    tb.Tarih,
    tb.TeklifKonusu,
    m.Firma_Adi AS MusteriAdi,
    tb.Notlar,
    tb.TeklifDurum
  FROM TeklifBaslik tb
  LEFT JOIN Firma m ON m.ID = tb.MusteriID
`;

const VISIBILITY_WHERE = `
  tb.Durum = 'Aktif'
  AND (tb.TeklifDurum IS NULL OR tb.TeklifDurum NOT IN ('Taslak','Hazırlanıyor','Hazirlaniyor','Draft'))
`;

void DRAFT_DURUMLAR;

export async function listTeklifler(
  user: SessionUser
): Promise<TeklifListItem[]> {
  if (isAdmin(user)) {
    const rows = await query<RawListRow>(
      `${SELECT_LIST}
       WHERE ${VISIBILITY_WHERE}
       ORDER BY tb.Tarih DESC, tb.ID DESC`
    );
    return mapList(rows);
  }

  if (user.tur === "Plasiyer") {
    if (user.plasiyerId == null) return [];
    const rows = await query<RawListRow>(
      `${SELECT_LIST}
       WHERE ${VISIBILITY_WHERE}
         AND m.PlasiyerID = @pid
       ORDER BY tb.Tarih DESC, tb.ID DESC`,
      { pid: user.plasiyerId }
    );
    return mapList(rows);
  }

  const rows = await query<RawListRow>(
    `${SELECT_LIST}
     WHERE ${VISIBILITY_WHERE}
       AND tb.MusteriID = @firmaId
     ORDER BY tb.Tarih DESC, tb.ID DESC`,
    { firmaId: user.id }
  );
  return mapList(rows);
}

export interface TeklifBaslik {
  ID: number;
  TeklifNo: string;
  TeklifTuru: string | null;
  Tarih: Date | null;
  ParaBirimi: string | null;
  TeklifDurum: string | null;
  OnayTarih: Date | null;
  Aciklama: string | null;
  FirmaID: number | null;
  Firma_Adi: string | null;
  FirmaAdres: string | null;
  Telefon: string | null;
  Mail: string | null;
  TeklifKonusu: string | null;
  TeklifVeren: string | null;
  Toplam: number | null;
  KdvOran: number | null;
  GenelIskonto: number | null;
  RevNo: number;
}

export interface TeklifSatir {
  ID: number;
  Akreditasyon: string | null;
  Hizmet: string | null;
  Metot: string | null;
  "Test Süresi (Gün)": number | null;
  "Numune Miktarı": string | null;
  "Birim Fiyat": string;
  Adet: number | null;
  Toplam: string;
}

interface RawBaslikRow {
  ID: number;
  TeklifNo: number | null;
  DisTeklifKodu: string | null;
  RevNo: number;
  MusteriID: number | null;
  Tarih: Date | null;
  Toplam: string | number | null;
  Notlar: string | null;
  TeklifDurum: string | null;
  KdvOran: number | null;
  TeklifKonusu: string | null;
  TeklifVeren: string | null;
  GenelIskonto: string | number | null;
  Firma_Adi: string | null;
  FirmaAdres: string | null;
  Telefon: string | null;
  Mail: string | null;
}

interface RawKalemRow {
  ID: number;
  HizmetAdi: string | null;
  Metot: string | null;
  Akreditasyon: string | null;
  Fiyat: string | number | null;
  Adet: number | null;
  Iskonto: string | number | null;
  ParaBirimi: string | null;
}

function formatTeklifNo(dis: string | null, no: number | null, rev: number) {
  const head = dis ?? (no != null ? `UQ${no}` : "—");
  const tail = String(rev).padStart(2, "0");
  return `${head}/${tail}`;
}

function toMoney(v: string | number | null | undefined): string {
  if (v == null) return "0,00";
  const n = typeof v === "string" ? Number(v) : v;
  if (!Number.isFinite(n)) return String(v);
  return n.toLocaleString("tr-TR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function toNum(v: string | number | null | undefined): number {
  if (v == null) return 0;
  const n = typeof v === "string" ? Number(v) : v;
  return Number.isFinite(n) ? n : 0;
}

export async function getTeklifDetail(idOrTeklifNo: number) {
  const row = await queryOne<RawBaslikRow>(
    `SELECT
        tb.ID, tb.TeklifNo, tb.DisTeklifKodu, tb.RevNo, tb.MusteriID,
        tb.Tarih, tb.Toplam, tb.Notlar, tb.TeklifDurum, tb.KdvOran,
        tb.TeklifKonusu, tb.TeklifVeren, tb.GenelIskonto,
        m.Firma_Adi, m.Adres AS FirmaAdres, m.Telefon, m.Mail
     FROM TeklifBaslik tb
     LEFT JOIN Firma m ON m.ID = tb.MusteriID
     WHERE tb.ID = @id AND tb.Durum = 'Aktif'
     LIMIT 1`,
    { id: idOrTeklifNo }
  );
  if (!row) return { baslik: null, satirlar: [] as TeklifSatir[] };

  const kalemler = await query<RawKalemRow>(
    `SELECT ID, HizmetAdi, Metot, Akreditasyon, Fiyat, Adet, Iskonto, ParaBirimi
     FROM TeklifKalem
     WHERE TeklifID = @id
     ORDER BY ID`,
    { id: row.ID }
  );

  const paraBirimi = kalemler[0]?.ParaBirimi ?? "₺";

  const baslik: TeklifBaslik = {
    ID: row.ID,
    TeklifNo: formatTeklifNo(row.DisTeklifKodu, row.TeklifNo, row.RevNo),
    TeklifTuru: row.TeklifKonusu,
    Tarih: row.Tarih,
    ParaBirimi: paraBirimi,
    TeklifDurum: row.TeklifDurum,
    OnayTarih: null,
    Aciklama: row.Notlar,
    FirmaID: row.MusteriID,
    Firma_Adi: row.Firma_Adi,
    FirmaAdres: row.FirmaAdres,
    Telefon: row.Telefon,
    Mail: row.Mail,
    TeklifKonusu: row.TeklifKonusu,
    TeklifVeren: row.TeklifVeren,
    Toplam: row.Toplam == null ? null : toNum(row.Toplam),
    KdvOran: row.KdvOran,
    GenelIskonto: row.GenelIskonto == null ? null : toNum(row.GenelIskonto),
    RevNo: row.RevNo,
  };

  const satirlar: TeklifSatir[] = kalemler.map((k) => {
    const fiyat = toNum(k.Fiyat);
    const adet = k.Adet ?? 0;
    const isk = toNum(k.Iskonto);
    const toplam = fiyat * adet * (1 - isk / 100);
    return {
      ID: k.ID,
      Akreditasyon: k.Akreditasyon,
      Hizmet: k.HizmetAdi,
      Metot: k.Metot,
      "Test Süresi (Gün)": null,
      "Numune Miktarı": null,
      "Birim Fiyat": toMoney(fiyat),
      Adet: adet || null,
      Toplam: toMoney(toplam),
    };
  });

  return { baslik, satirlar };
}

export async function findTeklifByListId(id: number) {
  const r = await queryOne<{ ID: number }>(
    `SELECT ID FROM TeklifBaslik
     WHERE ID = @id AND Durum = 'Aktif'
       AND (TeklifDurum IS NULL OR TeklifDurum NOT IN ('Taslak','Hazırlanıyor','Hazirlaniyor','Draft'))
     LIMIT 1`,
    { id }
  );
  return r ? { TeklifNo: r.ID } : null;
}
