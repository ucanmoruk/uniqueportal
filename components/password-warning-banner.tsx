"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, X } from "lucide-react";

const STORAGE_KEY = "parola-uyari-kapandi";

export function PasswordWarningBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem(STORAGE_KEY)) setVisible(true);
  }, []);

  if (!visible) return null;

  function dismiss() {
    localStorage.setItem(STORAGE_KEY, "1");
    setVisible(false);
  }

  return (
    <div className="flex items-center gap-3 border border-amber-500/30 bg-amber-50 dark:bg-amber-950/20 px-4 py-3 text-sm mb-4">
      <AlertTriangle className="size-4 text-amber-600 shrink-0" />
      <p className="flex-1 text-amber-800 dark:text-amber-200">
        Giriş yöntemi e-posta adresine geçirildi. Güvenliğiniz için lütfen{" "}
        <Link href="/hesabim" className="font-semibold underline">
          parolanızı güncelleyin
        </Link>
        .
      </p>
      <button
        type="button"
        onClick={dismiss}
        className="shrink-0 p-1 hover:bg-amber-200/50 dark:hover:bg-amber-800/50 rounded"
      >
        <X className="size-4 text-amber-600" />
      </button>
    </div>
  );
}
