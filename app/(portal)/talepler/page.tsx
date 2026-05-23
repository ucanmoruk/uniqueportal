import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { listTalepler } from "@/lib/repositories/talep";
import { isAdmin } from "@/lib/permissions";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { TaleplerTable } from "./talepler-table";

export const dynamic = "force-dynamic";

export default async function TaleplerPage() {
  const user = await requireUser();
  const rows = await listTalepler(user);

  return (
    <>
      <PageHeader
        title="Talepler"
        description={`Toplam ${rows.length} talep.`}
        actions={
          <Button size="sm" asChild>
            <Link href="/talepler/yeni">
              <Plus className="size-4" /> Yeni Talep
            </Link>
          </Button>
        }
      />
      <TaleplerTable rows={rows} showOlusturan={isAdmin(user)} />
    </>
  );
}
