"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { iptalTalepAction } from "./actions";

interface Props {
  talepId: number;
  talepNo: string; // Görsel etiket (ÜGAM/26/XXXX veya UQ193)
}

export function IptalTalepButton({ talepId, talepNo }: Props) {
  const [pending, startTransition] = React.useTransition();
  const [err, setErr] = React.useState<string | null>(null);
  const router = useRouter();

  const onClick = () => {
    setErr(null);
    const ok = window.confirm(
      `${talepNo} numaralı talebi iptal etmek istiyor musunuz?\n\nİptal edilen talepler listeden kaldırılır ve geri alınamaz.`
    );
    if (!ok) return;
    startTransition(async () => {
      const r = await iptalTalepAction(talepId);
      if (r.ok) {
        router.push("/talepler");
        router.refresh();
      } else {
        setErr(r.error);
      }
    });
  };

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={onClick}
        disabled={pending}
        className="text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
      >
        <Trash2 className="size-4" />
        {pending ? "İptal ediliyor…" : "Talebi İptal Et"}
      </Button>
      {err && (
        <span className="text-xs text-destructive ml-2" role="alert">
          {err}
        </span>
      )}
    </>
  );
}
