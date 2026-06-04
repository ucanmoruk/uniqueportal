"use client";

import { useRouter } from "next/navigation";

/**
 * Yazdır ekranı için yapışık toolbar.
 *
 * - "Yazdır" → `window.print()` tetikler. Çıkan diyalogdan istenirse
 *   "PDF Olarak Kaydet" seçilebilir, istenirse direkt yazıcıya gönderilir.
 * - Toolbar yazdırma sırasında gizli (TeklifPrintDocument içinde
 *   `@media print { .toolbar { display: none } }` tanımlı).
 */
export function PrintToolbar({ backHref }: { backHref: string }) {
  const router = useRouter();

  return (
    <div className="toolbar">
      <button
        type="button"
        className="btn-pdf"
        onClick={() => window.print()}
      >
        Yazdır
      </button>
      <button
        type="button"
        className="btn-close"
        onClick={() => {
          // Yeni sekmede açıldıysa sekmeyi kapat; değilse listeye dön.
          if (window.opener) {
            window.close();
          } else {
            router.push(backHref);
          }
        }}
      >
        Kapat
      </button>
    </div>
  );
}
