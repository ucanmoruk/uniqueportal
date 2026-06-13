import { requireUser } from "@/lib/auth";
import { findFirmaById } from "@/lib/repositories/firma";
import { YeniTalepForm } from "./talep-form";

export const dynamic = "force-dynamic";

export default async function YeniTalepPage() {
  const user = await requireUser();
  const firma = await findFirmaById(user.id);

  return (
    <YeniTalepForm
      defaults={{
        Firma: firma?.Firma_Adi ?? user.firmaAdi,
        Adres: firma?.Adres ?? "",
        Yetkili: firma?.Yetkili ?? "",
        Telefon: firma?.Telefon ?? "",
        Mail: firma?.Mail ?? "",
        VergiDairesi: firma?.Vergi_Dairesi ?? "",
        VergiNo: firma?.Vergi_No ?? "",
      }}
    />
  );
}
