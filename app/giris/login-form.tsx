"use client";

import { useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { loginAction, type LoginState } from "./actions";
import { Loader2, LogIn, AlertCircle } from "lucide-react";

const initialState: LoginState = {};

export function LoginForm() {
  const params = useSearchParams();
  const next = params.get("next") ?? "/ozet";
  const [state, formAction, pending] = useActionState(loginAction, initialState);

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="next" value={next} />

      <div className="space-y-2">
        <Label htmlFor="kod">Firma Kodu</Label>
        <Input
          id="kod"
          name="kod"
          type="text"
          autoComplete="username"
          placeholder="UQ12345"
          required
          autoFocus
          className="h-10"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="parola">Parola</Label>
        <Input
          id="parola"
          name="parola"
          type="password"
          autoComplete="current-password"
          required
          className="h-10"
        />
      </div>

      {state.error && (
        <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2.5 text-sm text-destructive">
          <AlertCircle className="size-4 shrink-0 mt-0.5" />
          <span>{state.error}</span>
        </div>
      )}

      <Button type="submit" size="lg" className="w-full h-11" disabled={pending}>
        {pending ? (
          <>
            <Loader2 className="animate-spin" />
            Giriş yapılıyor…
          </>
        ) : (
          <>
            <LogIn />
            Giriş Yap
          </>
        )}
      </Button>
    </form>
  );
}
