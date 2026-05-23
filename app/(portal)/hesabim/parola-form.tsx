"use client";

import { useActionState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { KeyRound, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { updateParolaAction, type ParolaState } from "./actions";

const initial: ParolaState = {};

export function ParolaForm() {
  const [state, formAction, pending] = useActionState(updateParolaAction, initial);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) {
      toast.success("Parolanız güncellendi. Bir sonraki girişte yeni parolayı kullanın.");
      formRef.current?.reset();
    } else if (state.error) {
      toast.error(state.error);
    }
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="mevcut">Mevcut Parola</Label>
        <Input id="mevcut" name="mevcut" type="password" required />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="yeni">Yeni Parola</Label>
          <Input id="yeni" name="yeni" type="password" required minLength={4} maxLength={15} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="yeniTekrar">Yeni Parola (tekrar)</Label>
          <Input
            id="yeniTekrar"
            name="yeniTekrar"
            type="password"
            required
            minLength={4}
            maxLength={15}
          />
        </div>
      </div>

      <div className="flex justify-end">
        <Button type="submit" variant="outline" disabled={pending}>
          {pending ? (
            <>
              <Loader2 className="animate-spin" /> Değiştiriliyor…
            </>
          ) : (
            <>
              <KeyRound /> Parolayı Değiştir
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
