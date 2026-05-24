import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { listUserRelatedItems } from "@/lib/repositories/destek";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { YeniDestekForm } from "./yeni-destek-form";

export const dynamic = "force-dynamic";

export default async function YeniDestekPage() {
  const user = await requireUser();
  const items = await listUserRelatedItems(user);

  return (
    <>
      <PageHeader
        title="Yeni Destek Talebi"
        description={`Soru veya talebinizi iletin. ${items.length} ilgili kayıt bağlayabilirsiniz.`}
        actions={
          <Button variant="outline" size="sm" asChild>
            <Link href="/destek">
              <ArrowLeft className="size-4" /> Listeye dön
            </Link>
          </Button>
        }
      />

      <YeniDestekForm items={items} />
    </>
  );
}
