import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { listDestek } from "@/lib/repositories/destek";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { DestekTable } from "./destek-table";

export const dynamic = "force-dynamic";

export default async function DestekPage() {
  const user = await requireUser();
  const rows = await listDestek(user);

  return (
    <>
      <PageHeader
        title="Destek Talepleri"
        description={`Toplam ${rows.length} talep.`}
        actions={
          <Button size="sm" asChild>
            <Link href="/destek/yeni">
              <Plus className="size-4" /> Yeni Talep
            </Link>
          </Button>
        }
      />
      <DestekTable rows={rows} />
    </>
  );
}
