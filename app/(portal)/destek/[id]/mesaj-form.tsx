"use client";

import { useActionState, useEffect, useRef } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Send, Loader2 } from "lucide-react";
import { gonderMesajAction, type MesajState } from "./actions";
import { toast } from "sonner";

const initial: MesajState = {};

export function MesajForm({ talepId }: { talepId: number }) {
  const [state, formAction, pending] = useActionState(gonderMesajAction, initial);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) {
      toast.success("Mesajınız gönderildi.");
      formRef.current?.reset();
    } else if (state.error) {
      toast.error(state.error);
    }
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="space-y-3">
      <input type="hidden" name="talepId" value={talepId} />
      <Textarea
        name="mesaj"
        placeholder="Mesajınızı yazın…"
        required
        maxLength={5000}
        rows={3}
      />
      <div className="flex justify-end">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? (
            <>
              <Loader2 className="animate-spin" /> Gönderiliyor…
            </>
          ) : (
            <>
              <Send /> Gönder
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
