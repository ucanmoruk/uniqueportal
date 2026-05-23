"use client";

import * as React from "react";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Trash2, Loader2, Save } from "lucide-react";
import { yeniTalepAction, type YeniTalepState } from "./actions";

interface NumuneSatir {
  id: string;
  Numune: string;
  Ozellik: string;
  Analiz: string;
  Metot: string;
}

const initialState: YeniTalepState = {};

export function YeniTalepForm({
  defaults,
}: {
  defaults: {
    Firma: string;
    Adres: string;
    Yetkili: string;
    Mail: string;
    Telefon: string;
    VergiDairesi: string;
    VergiNo: string;
  };
}) {
  const [state, formAction, pending] = useActionState(yeniTalepAction, initialState);

  const [numuneler, setNumuneler] = React.useState<NumuneSatir[]>([
    { id: crypto.randomUUID(), Numune: "", Ozellik: "", Analiz: "", Metot: "" },
  ]);

  function addNumune() {
    setNumuneler((prev) => [
      ...prev,
      { id: crypto.randomUUID(), Numune: "", Ozellik: "", Analiz: "", Metot: "" },
    ]);
  }

  function removeNumune(id: string) {
    setNumuneler((prev) =>
      prev.length > 1 ? prev.filter((n) => n.id !== id) : prev
    );
  }

  return (
    <form action={formAction} className="space-y-6">
      {state.error && (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.error}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Raporlama Bilgileri</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Firma Adı"
            name="raporlama_Firma"
            defaultValue={defaults.Firma}
            required
            className="sm:col-span-2"
          />
          <Field
            label="Adres"
            name="raporlama_Adres"
            defaultValue={defaults.Adres}
            multiline
            className="sm:col-span-2"
          />
          <Field
            label="Yetkili"
            name="raporlama_Yetkili"
            defaultValue={defaults.Yetkili}
          />
          <Field
            label="İletişim (Tel / E-posta)"
            name="raporlama_Iletisim"
            defaultValue={defaults.Telefon}
          />

          <div className="space-y-1.5">
            <Label htmlFor="raporlama_Karar">Karar</Label>
            <Select id="raporlama_Karar" name="raporlama_Karar" defaultValue="İstenmiyor">
              <option value="İstenmiyor">İstenmiyor</option>
              <option value="İstiyor">İstiyor</option>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="raporlama_Dil">Rapor Dili</Label>
            <Select id="raporlama_Dil" name="raporlama_Dil" defaultValue="Türkçe">
              <option value="Türkçe">Türkçe</option>
              <option value="İngilizce">İngilizce</option>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="raporlama_Iade">Numune İadesi</Label>
            <Select id="raporlama_Iade" name="raporlama_Iade" defaultValue="Hayır">
              <option value="Hayır">Hayır</option>
              <option value="Evet">Evet</option>
            </Select>
          </div>
          <Field
            label="Üretici Firma"
            name="raporlama_UreticiFirma"
          />

          <Field
            label="Not"
            name="raporlama_Note"
            multiline
            className="sm:col-span-2"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Fatura Bilgileri</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Firma"
            name="fatura_Firma"
            defaultValue={defaults.Firma}
            className="sm:col-span-2"
          />
          <Field
            label="Adres"
            name="fatura_Adres"
            defaultValue={defaults.Adres}
            multiline
            className="sm:col-span-2"
          />
          <Field
            label="Vergi Dairesi"
            name="fatura_VergiDairesi"
            defaultValue={defaults.VergiDairesi}
          />
          <Field
            label="Vergi No"
            name="fatura_VergiNo"
            defaultValue={defaults.VergiNo}
          />
          <Field
            label="E-posta"
            name="fatura_Mail"
            type="email"
            defaultValue={defaults.Mail}
            className="sm:col-span-2"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Numuneler ({numuneler.length})</CardTitle>
          <Button type="button" variant="outline" size="sm" onClick={addNumune}>
            <Plus className="size-4" /> Yeni Satır
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {numuneler.map((n, idx) => (
            <div
              key={n.id}
              className="grid gap-3 sm:grid-cols-4 border rounded-lg p-4 relative bg-muted/20"
            >
              <div className="absolute -top-2 left-3 px-1.5 text-xs bg-background text-muted-foreground rounded">
                #{idx + 1}
              </div>
              <Field
                label="Numune"
                name={`numuneler[${idx}][Numune]`}
                placeholder="Örn: Krem 100ml"
              />
              <Field
                label="Özellik"
                name={`numuneler[${idx}][Ozellik]`}
                placeholder="Renk / forma"
              />
              <Field
                label="Analiz"
                name={`numuneler[${idx}][Analiz]`}
                placeholder="pH, viskozite vs."
              />
              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <Field
                    label="Metot"
                    name={`numuneler[${idx}][Metot]`}
                    placeholder="TS EN ..."
                  />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeNumune(n.id)}
                  disabled={numuneler.length === 1}
                  title="Satırı sil"
                  className="text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="flex items-center gap-3 rounded-lg border bg-card p-4">
        <input
          id="sozlesme"
          name="sozlesme"
          type="checkbox"
          required
          className="size-4 rounded border-input"
        />
        <label htmlFor="sozlesme" className="text-sm cursor-pointer">
          UNIQUE hizmet sözleşmesini okudum ve kabul ediyorum.
        </label>
      </div>

      <div className="flex justify-end gap-2">
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? (
            <>
              <Loader2 className="animate-spin" /> Kaydediliyor…
            </>
          ) : (
            <>
              <Save /> Talebi Oluştur
            </>
          )}
        </Button>
      </div>
    </form>
  );
}

function Field({
  label,
  name,
  defaultValue = "",
  required,
  multiline,
  type,
  className,
  placeholder,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  required?: boolean;
  multiline?: boolean;
  type?: string;
  className?: string;
  placeholder?: string;
}) {
  return (
    <div className={["space-y-1.5", className].filter(Boolean).join(" ")}>
      <Label htmlFor={name}>
        {label}
        {required && <span className="text-destructive"> *</span>}
      </Label>
      {multiline ? (
        <Textarea
          id={name}
          name={name}
          defaultValue={defaultValue}
          required={required}
          placeholder={placeholder}
        />
      ) : (
        <Input
          id={name}
          name={name}
          type={type ?? "text"}
          defaultValue={defaultValue}
          required={required}
          placeholder={placeholder}
        />
      )}
    </div>
  );
}
