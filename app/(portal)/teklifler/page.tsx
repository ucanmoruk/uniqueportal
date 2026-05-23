import { requireUser } from "@/lib/auth";
import { listTeklifler } from "@/lib/repositories/teklif";
import { PageHeader } from "@/components/page-header";
import { TekliflerTable } from "./teklifler-table";

export const dynamic = "force-dynamic";

export default async function TekliflerPage() {
  const user = await requireUser();
  const rows = await listTeklifler(user);

  return (
    <>
      <PageHeader title="Teklifler" description={`Toplam ${rows.length} teklif.`} />
      <TekliflerTable rows={rows} />
    </>
  );
}
