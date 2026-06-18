import {
  query,
  queryOne,
  withTransaction,
  insertAndGetId,
  queryOneConn,
  executeConn,
} from "@/lib/db-mysql";
import { scopeByFirma } from "@/lib/permissions";
import type { SessionUser } from "@/types/db";

export interface TalepListeItem {
  ID: number;
  "Talep No": string;
  Tarih: Date | null;
  "Talep Oluşturan": string | null;
  "Müşteri": string | null;
  Durum: string | null;
  FirmaKodu: string | null;
}

export async function listTalepler(
  user: SessionUser
): Promise<TalepListeItem[]> {
  const scope = scopeByFirma(user, "firmakodu");
  return query<TalepListeItem>(
    `SELECT ID, \`Talep No\`, Tarih, \`Talep Oluşturan\`, \`Müşteri\`, Durum, FirmaKodu
     FROM VIEW_TALEP_LISTE
     WHERE ${scope.clause}
     ORDER BY Tarih DESC, ID DESC`,
    scope.params
  );
}

export interface TalepDetail {
  talep: {
    ID: number;
    TalepNo: number;
    DisTalepKodu: string | null;
    Tarih: Date | null;
    FirmaKodu: string | null;
    Durum: string | null;
    Tur: string | null;
  } | null;
  raporlama: {
    Firma: string | null;
    Adres: string | null;
    Yetkili: string | null;
    Iletisim: string | null;
    Karar: string | null;
    Dil: string | null;
    Iade: string | null;
    UreticiFirma: string | null;
    Note: string | null;
  } | null;
  fatura: {
    Firma: string | null;
    Adres: string | null;
    VergiDairesi: string | null;
    VergiNo: string | null;
    Mail: string | null;
  } | null;
  numuneler: Array<{
    ID: number;
    Numune: string | null;
    Ozellik: string | null;
    Analiz: string | null;
    Metot: string | null;
  }>;
}

export async function getTalepDetail(
  user: SessionUser,
  id: number
): Promise<TalepDetail> {
  const talep = await queryOne<{
    ID: number;
    TalepNo: number;
    DisTalepKodu: string | null;
    Tarih: Date | null;
    FirmaKodu: string | null;
    Durum: string | null;
    Tur: string | null;
  }>(
    `SELECT ID, TalepNo, DisTalepKodu, Tarih, FirmaKodu, Durum, Tur
     FROM Talep WHERE ID = @id`,
    { id }
  );

  if (!talep) {
    return { talep: null, raporlama: null, fatura: null, numuneler: [] };
  }

  if (user.tur !== "Admin" && talep.FirmaKodu !== user.kod) {
    return { talep: null, raporlama: null, fatura: null, numuneler: [] };
  }

  const [raporlama, fatura, numuneler] = await Promise.all([
    queryOne<{
      Firma: string | null;
      Adres: string | null;
      Yetkili: string | null;
      Iletisim: string | null;
      Karar: string | null;
      Dil: string | null;
      Iade: string | null;
      UreticiFirma: string | null;
      Note: string | null;
    }>(
      `SELECT Firma, Adres, Yetkili, Iletisim, Karar, Dil, Iade, UreticiFirma, Note
       FROM TalepRaporlama WHERE TalepID = @id`,
      { id }
    ),
    queryOne<{
      Firma: string | null;
      Adres: string | null;
      VergiDairesi: string | null;
      VergiNo: string | null;
      Mail: string | null;
    }>(
      `SELECT Firma, Adres, VergiDairesi, VergiNo, Mail
       FROM TalepFatura WHERE TalepID = @id`,
      { id }
    ),
    query<{
      ID: number;
      Numune: string | null;
      Ozellik: string | null;
      Analiz: string | null;
      Metot: string | null;
    }>(
      `SELECT ID, Numune, Ozellik, Analiz, Metot
       FROM TalepNumune WHERE TalepID = @id ORDER BY ID`,
      { id }
    ),
  ]);

  return { talep, raporlama, fatura, numuneler };
}

export interface YeniTalepInput {
  user: SessionUser;
  raporlama: {
    Firma: string;
    Adres: string;
    Yetkili: string;
    Iletisim: string;
    Karar: string;
    Dil: string;
    Iade: string;
    UreticiFirma: string;
    Note: string;
  };
  fatura: {
    Firma: string;
    Adres: string;
    VergiDairesi: string;
    VergiNo: string;
    Mail: string;
  };
  numuneler: Array<{
    Numune: string;
    Ozellik: string;
    Analiz: string;
    Metot: string;
  }>;
  sozlesme: number;
}

const TALEP_KOD_ALFABE = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

function randomKod(uzunluk = 4): string {
  let s = "";
  for (let i = 0; i < uzunluk; i++) {
    s += TALEP_KOD_ALFABE[Math.floor(Math.random() * TALEP_KOD_ALFABE.length)];
  }
  return s;
}

function uretDisTalepKodu(now = new Date()): string {
  const yil = String(now.getFullYear()).slice(2);
  return `ÜGAM/${yil}/${randomKod(4)}`;
}

export interface PublicTalepInput {
  raporlama: YeniTalepInput["raporlama"] & { Mail?: string };
  fatura: YeniTalepInput["fatura"];
  numuneler: YeniTalepInput["numuneler"];
  sozlesme: number;
}

export async function createPublicTalep(input: PublicTalepInput): Promise<number> {
  return withTransaction(async (conn) => {
    const last = await queryOneConn<{ TalepNo: number | null }>(
      conn,
      `SELECT TalepNo FROM Talep ORDER BY ID DESC LIMIT 1`
    );
    const yeniNo = Number(last?.TalepNo ?? 0) + 1;

    let disKod = uretDisTalepKodu();
    for (let i = 0; i < 5; i++) {
      const dupe = await queryOneConn<{ n: number }>(
        conn,
        `SELECT COUNT(*) AS n FROM Talep WHERE DisTalepKodu = @k`,
        { k: disKod }
      );
      if ((dupe?.n ?? 0) === 0) break;
      disKod = uretDisTalepKodu();
    }

    const talepId = await insertAndGetId(
      conn,
      `INSERT INTO Talep (Tarih, FirmaKodu, Sozlesme, Durum, TalepNo, DisTalepKodu, Yetkili, Tur, Olusturan)
       VALUES (@tarih, @kod, @sozlesme, @durum, @talepNo, @disTalepKodu, @yetkili, @tur, @olusturan)`,
      {
        tarih: new Date(),
        kod: "YENI",
        sozlesme: input.sozlesme ? 1 : 0,
        durum: "Yeni Talep",
        talepNo: yeniNo,
        disTalepKodu: disKod,
        yetkili: 0,
        tur: "Analiz",
        olusturan: 0,
      }
    );

    const r = input.raporlama;
    const rMail = (r as { Mail?: string }).Mail ?? "";
    if (rMail) {
      await executeConn(
        conn,
        `INSERT INTO TalepRaporlama
         (TalepID, Firma, Adres, Yetkili, Iletisim, Karar, Dil, Iade, UreticiFirma, Note, Mail)
         VALUES (@tid, @firma, @adres, @yetkili, @iletisim, @karar, @dil, @iade, @uretici, @note, @rmail)`,
        {
          tid: talepId,
          firma: r.Firma ?? "",
          adres: r.Adres ?? "",
          yetkili: r.Yetkili ?? "",
          iletisim: r.Iletisim ?? "",
          karar: r.Karar ?? "",
          dil: r.Dil ?? "Türkçe",
          iade: r.Iade ?? "Hayır",
          uretici: r.UreticiFirma ?? "",
          note: r.Note ?? "",
          rmail: rMail,
        }
      );
    } else {
      await executeConn(
        conn,
        `INSERT INTO TalepRaporlama
         (TalepID, Firma, Adres, Yetkili, Iletisim, Karar, Dil, Iade, UreticiFirma, Note)
         VALUES (@tid, @firma, @adres, @yetkili, @iletisim, @karar, @dil, @iade, @uretici, @note)`,
        {
          tid: talepId,
          firma: r.Firma ?? "",
          adres: r.Adres ?? "",
          yetkili: r.Yetkili ?? "",
          iletisim: r.Iletisim ?? "",
          karar: r.Karar ?? "",
          dil: r.Dil ?? "Türkçe",
          iade: r.Iade ?? "Hayır",
          uretici: r.UreticiFirma ?? "",
          note: r.Note ?? "",
        }
      );
    }

    const f = input.fatura;
    await executeConn(
      conn,
      `INSERT INTO TalepFatura (TalepID, Firma, Adres, VergiDairesi, VergiNo, Mail)
       VALUES (@tid, @firma, @adres, @vd, @vno, @mail)`,
      {
        tid: talepId,
        firma: f.Firma ?? "",
        adres: f.Adres ?? "",
        vd: f.VergiDairesi ?? "",
        vno: f.VergiNo ?? "",
        mail: f.Mail ?? "",
      }
    );

    for (const n of input.numuneler) {
      if (!n.Numune?.trim() && !n.Analiz?.trim()) continue;
      await executeConn(
        conn,
        `INSERT INTO TalepNumune (TalepID, Numune, Ozellik, Analiz, Metot)
         VALUES (@tid, @numune, @ozellik, @analiz, @metot)`,
        {
          tid: talepId,
          numune: n.Numune ?? "",
          ozellik: n.Ozellik ?? "",
          analiz: n.Analiz ?? "",
          metot: n.Metot ?? "",
        }
      );
    }

    return talepId;
  });
}

export async function createTalep(input: YeniTalepInput): Promise<number> {
  return withTransaction(async (conn) => {
    const last = await queryOneConn<{ TalepNo: number | null }>(
      conn,
      `SELECT TalepNo FROM Talep ORDER BY ID DESC LIMIT 1`
    );
    const yeniNo = Number(last?.TalepNo ?? 0) + 1;

    let disKod = uretDisTalepKodu();
    for (let i = 0; i < 5; i++) {
      const dupe = await queryOneConn<{ n: number }>(
        conn,
        `SELECT COUNT(*) AS n FROM Talep WHERE DisTalepKodu = @k`,
        { k: disKod }
      );
      if ((dupe?.n ?? 0) === 0) break;
      disKod = uretDisTalepKodu();
    }

    const talepId = await insertAndGetId(
      conn,
      `INSERT INTO Talep (Tarih, FirmaKodu, Sozlesme, Durum, TalepNo, DisTalepKodu, Yetkili, Tur, Olusturan)
       VALUES (@tarih, @kod, @sozlesme, @durum, @talepNo, @disTalepKodu, @yetkili, @tur, @olusturan)`,
      {
        tarih: new Date(),
        kod: input.user.kod ?? "",
        sozlesme: input.sozlesme ? 1 : 0,
        durum: "Yeni Talep",
        talepNo: yeniNo,
        disTalepKodu: disKod,
        yetkili: 0,
        tur: "Analiz",
        olusturan: input.user.id,
      }
    );

    const r = input.raporlama;
    await executeConn(
      conn,
      `INSERT INTO TalepRaporlama
       (TalepID, Firma, Adres, Yetkili, Iletisim, Karar, Dil, Iade, UreticiFirma, Note)
       VALUES (@tid, @firma, @adres, @yetkili, @iletisim, @karar, @dil, @iade, @uretici, @note)`,
      {
        tid: talepId,
        firma: r.Firma ?? "",
        adres: r.Adres ?? "",
        yetkili: r.Yetkili ?? "",
        iletisim: r.Iletisim ?? "",
        karar: r.Karar ?? "",
        dil: r.Dil ?? "Türkçe",
        iade: r.Iade ?? "Hayır",
        uretici: r.UreticiFirma ?? "",
        note: r.Note ?? "",
      }
    );

    const f = input.fatura;
    await executeConn(
      conn,
      `INSERT INTO TalepFatura (TalepID, Firma, Adres, VergiDairesi, VergiNo, Mail)
       VALUES (@tid, @firma, @adres, @vd, @vno, @mail)`,
      {
        tid: talepId,
        firma: f.Firma ?? "",
        adres: f.Adres ?? "",
        vd: f.VergiDairesi ?? "",
        vno: f.VergiNo ?? "",
        mail: f.Mail ?? "",
      }
    );

    for (const n of input.numuneler) {
      if (!n.Numune?.trim() && !n.Analiz?.trim()) continue;
      await executeConn(
        conn,
        `INSERT INTO TalepNumune (TalepID, Numune, Ozellik, Analiz, Metot)
         VALUES (@tid, @numune, @ozellik, @analiz, @metot)`,
        {
          tid: talepId,
          numune: n.Numune ?? "",
          ozellik: n.Ozellik ?? "",
          analiz: n.Analiz ?? "",
          metot: n.Metot ?? "",
        }
      );
    }

    return talepId;
  });
}
