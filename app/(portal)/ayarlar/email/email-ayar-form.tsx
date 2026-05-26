"use client";

import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, Save, Send, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import {
  saveEmailAyarAction,
  testMailAction,
  type EmailAyarState,
  type TestMailState,
} from "./actions";

interface InitialValues {
  Host: string;
  Port: number;
  Secure: boolean;
  Username: string;
  HasSifre: boolean;
  FromEmail: string;
  FromName: string;
  Aktif: boolean;
}

const initialSave: EmailAyarState = {};
const initialTest: TestMailState = {};

export function EmailAyarForm({
  initial,
  defaultTestEmail,
}: {
  initial: InitialValues;
  defaultTestEmail: string;
}) {
  const [saveState, saveAction, savePending] = useActionState(
    saveEmailAyarAction,
    initialSave
  );
  const [testState, testActionState, testPending] = useActionState(
    testMailAction,
    initialTest
  );

  const [testTo, setTestTo] = useState(defaultTestEmail);

  useEffect(() => {
    if (saveState.ok) toast.success(saveState.message ?? "Kaydedildi.");
    else if (saveState.error) toast.error(saveState.error);
  }, [saveState]);

  useEffect(() => {
    if (testState.ok) toast.success(testState.message ?? "Test gönderildi.");
    else if (testState.error) toast.error(testState.error);
  }, [testState]);

  return (
    <div className="space-y-6">
      <form action={saveAction} className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="Host">SMTP Host *</Label>
            <Input
              id="Host"
              name="Host"
              placeholder="ör: mail.uniqueanaliz.com"
              defaultValue={initial.Host}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="Port">Port *</Label>
            <Input
              id="Port"
              name="Port"
              type="number"
              defaultValue={initial.Port}
              min={1}
              max={65535}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="Secure">Bağlantı</Label>
            <Select id="Secure" name="Secure" defaultValue={initial.Secure ? "on" : ""}>
              <option value="">STARTTLS (587) — yaygın</option>
              <option value="on">SSL/TLS (465)</option>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="Username">Kullanıcı Adı</Label>
            <Input
              id="Username"
              name="Username"
              placeholder="noreply@uniqueanaliz.com"
              defaultValue={initial.Username}
              autoComplete="off"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="Sifre">
              Şifre {initial.HasSifre && "(mevcut korunur)"}
            </Label>
            <Input
              id="Sifre"
              name="Sifre"
              type="password"
              placeholder={initial.HasSifre ? "Değiştirmek için yeni şifre…" : "SMTP şifresi"}
              autoComplete="new-password"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="FromEmail">Gönderen E-posta *</Label>
            <Input
              id="FromEmail"
              name="FromEmail"
              type="email"
              placeholder="noreply@uniqueanaliz.com"
              defaultValue={initial.FromEmail}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="FromName">Gönderen Adı</Label>
            <Input
              id="FromName"
              name="FromName"
              placeholder="UNIQUE ANALYSE"
              defaultValue={initial.FromName}
            />
          </div>

          <div className="space-y-1.5 sm:col-span-2 flex items-center gap-3 mt-2">
            <input
              id="Aktif"
              name="Aktif"
              type="checkbox"
              defaultChecked={initial.Aktif}
              className="size-4"
            />
            <label htmlFor="Aktif" className="text-sm">
              Mail gönderimi <strong>aktif</strong> (kapalıysa hiçbir mail gönderilmez)
            </label>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2">
          <Button type="submit" disabled={savePending}>
            {savePending ? (
              <>
                <Loader2 className="animate-spin" /> Kaydediliyor…
              </>
            ) : (
              <>
                <Save /> Ayarları Kaydet
              </>
            )}
          </Button>
        </div>
      </form>

      <div className="border-t pt-6">
        <h3 className="text-base font-semibold tracking-tight flex items-center gap-2">
          <Mail className="size-4 text-primary" /> Test Maili Gönder
        </h3>
        <p className="text-sm text-muted-foreground mt-1.5 mb-4">
          Ayarları kaydettikten sonra buradan kendi e-posta adresinize test maili
          atarak bağlantıyı doğrulayabilirsiniz.
        </p>
        <form action={testActionState} className="flex flex-col sm:flex-row gap-3 sm:items-end">
          <div className="flex-1 space-y-1.5">
            <Label htmlFor="to">Test e-posta adresi</Label>
            <Input
              id="to"
              name="to"
              type="email"
              required
              value={testTo}
              onChange={(e) => setTestTo(e.target.value)}
            />
          </div>
          <Button type="submit" variant="outline" disabled={testPending}>
            {testPending ? (
              <>
                <Loader2 className="animate-spin" /> Test gönderiliyor…
              </>
            ) : (
              <>
                <Send /> Test Maili At
              </>
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
