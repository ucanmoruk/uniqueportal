"use client";

import { useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { loginAction, type LoginState } from "./actions";
import { Loader2, LogIn } from "lucide-react";

const initialState: LoginState = {};

export function LoginForm() {
  const params = useSearchParams();
  const next = params.get("next") ?? "/ozet";
  const [state, formAction, pending] = useActionState(loginAction, initialState);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="next" value={next} />

      <div className="space-y-2">
        <Label htmlFor="kod">Kullanıcı Kodu</Label>
        <Input
          id="kod"
          name="kod"
          type="text"
          autoComplete="username"
          placeholder="UQ12345"
          required
          autoFocus
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
        />
      </div>

      {state.error && (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.error}
        </div>
      )}

      <Button type="submit" size="lg" className="w-full" disabled={pending}>
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
