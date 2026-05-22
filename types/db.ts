export type FirmaTur = "Admin" | "Müşteri" | "Proje" | "Plasiyer";

export interface Firma {
  ID: number;
  Kod: string | null;
  Parola: string | null;
  ParolaHash?: string | null;
  Firma_Adi: string | null;
  Tur: FirmaTur | string | null;
  Yetkili: string | null;
  Plasiyer: string | null;
  PlasiyerID: number | null;
  Adres: string | null;
  Telefon: string | null;
  Mail: string | null;
  Vergi_Dairesi: string | null;
  Vergi_No: string | null;
  Durum: string | null;
  Sektor: string | null;
  Hizmet: string | null;
  Vade: string | null;
  Odeme: string | null;
}

export interface SessionUser {
  id: number;
  kod: string;
  firmaAdi: string;
  tur: FirmaTur | string;
  yetkili: string | null;
  plasiyerId: number | null;
}

export interface TalepListeRow {
  ID: number;
  "Talep No": string;
  Tarih: Date | string | null;
  Yetkili: number | null;
  FirmaKodu: string | null;
  FirmaID: number | null;
  "Talep Oluşturan": string | null;
  "Müşteri": string | null;
  Durum: string | null;
}

export interface TalepRow {
  ID: number;
  "Talep No": string;
  Tarih: Date | string | null;
  Yetkili: number | null;
  FirmaKodu: string | null;
  "Talep Türü": string | null;
  "Talep Oluşturan": string | null;
  Durum: string | null;
  Firma: string | null;
}

export interface TeklifRow {
  ID: number;
  "Teklif No": string;
  Tarih: Date | string | null;
  Tur: string | null;
  PlasiyerID: number | null;
  "Müşteri": string | null;
  Proje: string | null;
  Aciklama: string | null;
  Durum: string | null;
}

export interface TeklifBaslik {
  ID: number;
  TeklifNo: number;
  TeklifTuru: string | null;
  PlasiyerID: number | null;
  Tarih: Date | null;
  FirmaID: number | null;
  Durum: string | null;
  Aciklama: string | null;
  ProjeID: number | null;
  Iskonto: number | null;
  ParaBirimi: string | null;
  TeklifDurum: string | null;
  OnayTarih: Date | null;
}

export interface TeklifDetayRow {
  ID: number;
  TeklifNo: number;
  Akreditasyon: string | null;
  Hizmet: string | null;
  Metot: string | null;
  "Test Süresi (Gün)": number | null;
  "Numune Miktarı": string | null;
  "Birim Fiyat": string;
  Adet: number | null;
  Toplam: string;
}

export interface FaturaRow {
  ID: number;
  "Fatura No": string;
  Tarih: Date | string | null;
  Kod: string | null;
  FaturaFirmaID: number | null;
  Proje_ID: number | null;
  PlasiyerID: number | null;
  "Müşteri": string | null;
  Proje: string | null;
  Durum: string | null;
  Tutar: number;
  KDV: number;
  Toplam: number;
  "Ödeme": string | null;
}

export interface RaporRow {
  ID: number;
  Tarih: Date | string | null;
  "Dosya No": number;
  TalepNo: number | null;
  PlasiyerID: number | null;
  Yol: string | null;
  "Müşteri": string | null;
  Proje: string | null;
  "Dosya Türü": string | null;
  "Dosya Adı": string | null;
  RaporID: string | null;
  Durum: string | null;
}

export interface DestekTalebiRow {
  ID: number;
  TALEP_ID: number;
  "Talep No": string;
  Tarih: Date | string | null;
  Yetkili: number | null;
  FirmaKodu: string | null;
  "Talep Oluşturan": string | null;
  Konu: string | null;
  Durum: string | null;
}

export interface DestekMesaj {
  DETAY_ID: number;
  DESTEK_REF: number;
  MESAJ: string | null;
  MESAJ_TARIHI: string | null;
  KAYIT_EDEN: number | null;
  DETAY_DOSYA: string | null;
  Firma_Adi?: string | null;
  Tur?: string | null;
}

export interface TerminRow {
  ID: number;
  nID: number | null;
  "Evrak No": number | null;
  "Rapor No": number | null;
  Firma: string | null;
  Proje: string | null;
  Numune: string | null;
  Hizmet: string | null;
  Method: string | null;
  Kabul: Date | string | null;
  Termin: Date | string | null;
  Durum: string | null;
  Rapor: string | null;
  Yetkili: string | null;
}
