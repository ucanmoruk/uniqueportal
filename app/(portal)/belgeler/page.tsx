import { requireUser } from "@/lib/auth";
import { listRaporlar } from "@/lib/repositories/rapor";
import { isAdmin } from "@/lib/permissions";
import { PageHeader } from "@/components/page-header";
import { BelgelerTable } from "./belgeler-table";

export const dynamic = "force-dynamic";

export default async function BelgelerPage() {
  const user = await requireUser();
  const rows = await listRaporlar(user);

  return (
    <>
      <PageHeader
        title="Belgelerim"
        description={`Toplam ${rows.length} aktif rapor. Görüntüle butonuna tıklayarak PDF'i yeni sekmede açabilirsiniz.`}
      />
      <BelgelerTable
        rows={rows}
        showProje={isAdmin(user)}
        showMusteri={user.tur !== "Müşteri"}
        isAdmin={isAdmin(user)}
      />
    </>
  );
}
