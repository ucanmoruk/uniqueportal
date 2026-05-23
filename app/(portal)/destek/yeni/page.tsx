"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Loader2, Send } from "lucide-react";
import { yeniDestekAction, type YeniDestekState } from "./actions";

const initial: YeniDestekState = {};

export default function YeniDestekPage() {
  const [state, formAction, pending] = useActionState(yeniDestekAction, initial);

  return (
    <>
      <PageHeader
        title="Yeni Destek Talebi"
        description="Sorularınızı veya taleplerinizi iletin."
        actions={
          <Button variant="outline" size="sm" asChild>
            <Link href="/destek">
              <ArrowLeft className="size-4" /> Listeye dön
            </Link>
          </Button>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Talep Bilgileri</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={formAction} className="space-y-4">
            {state.error && (
              <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {state.error}
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="baslik">
                Başlık <span className="text-destructive">*</span>
              </Label>
              <Input
                id="baslik"
                name="baslik"
                placeholder="Örn: Rapor sonucumun gecikme nedeni"
                required
                maxLength={255}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="aciklama">
                Açıklama <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="aciklama"
                name="aciklama"
                placeholder="Sorununuzu detaylı şekilde anlatın..."
                required
                rows={6}
                maxLength={5000}
              />
            </div>

            <div className="flex justify-end">
              <Button type="submit" disabled={pending}>
                {pending ? (
                  <>
                    <Loader2 className="animate-spin" /> Gönderiliyor…
                  </>
                ) : (
                  <>
                    <Send /> Talep Oluştur
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </>
  );
}
