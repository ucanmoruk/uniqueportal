"use client";

import { useActionState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Save, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { updateProfilAction, type ProfilState } from "./actions";

const initial: ProfilState = {};

export function ProfilForm({
  defaults,
}: {
  defaults: {
    Firma_Adi: string;
    Adres: string;
    Vergi_Dairesi: string;
    Vergi_No: string;
    Telefon: string;
    Mail: string;
  };
}) {
  const [state, formAction, pending] = useActionState(updateProfilAction, initial);

  useEffect(() => {
    if (state.ok) toast.success("Profil bilgileriniz güncellendi.");
    else if (state.error) toast.error(state.error);
  }, [state]);

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="Firma_Adi">
          Firma Adı <span className="text-destructive">*</span>
        </Label>
        <Input id="Firma_Adi" name="Firma_Adi" defaultValue={defaults.Firma_Adi} required />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="Adres">Adres</Label>
        <Textarea id="Adres" name="Adres" defaultValue={defaults.Adres} rows={3} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="Vergi_Dairesi">Vergi Dairesi</Label>
          <Input
            id="Vergi_Dairesi"
            name="Vergi_Dairesi"
            defaultValue={defaults.Vergi_Dairesi}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="Vergi_No">Vergi No</Label>
          <Input
            id="Vergi_No"
            name="Vergi_No"
            defaultValue={defaults.Vergi_No}
            maxLength={15}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="Telefon">Telefon</Label>
          <Input id="Telefon" name="Telefon" defaultValue={defaults.Telefon} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="Mail">E-posta</Label>
          <Input id="Mail" name="Mail" type="email" defaultValue={defaults.Mail} />
        </div>
      </div>

      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending ? (
            <>
              <Loader2 className="animate-spin" /> Kaydediliyor…
            </>
          ) : (
            <>
              <Save /> Profili Güncelle
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
