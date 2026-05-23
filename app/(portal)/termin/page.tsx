import { requireUser } from "@/lib/auth";
import { listTermin } from "@/lib/repositories/termin";
import { isAdmin } from "@/lib/permissions";
import { PageHeader } from "@/components/page-header";
import { TerminTable } from "./termin-table";

export const dynamic = "force-dynamic";

export default async function TerminPage() {
  const user = await requireUser();
  const rows = await listTermin(user);

  return (
    <>
      <PageHeader
        title="Termin Takibi"
        description={`Son ${rows.length} kayıt — kırmızı: gecikmiş, sarı: 3 gün içinde.`}
      />
      <TerminTable rows={rows} showProje={isAdmin(user)} />
    </>
  );
}
