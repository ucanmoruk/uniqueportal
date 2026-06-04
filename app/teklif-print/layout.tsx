import type { ReactNode } from "react";

/**
 * Print layout — sidebar/topbar olmadan tam ekran çıktı için.
 * Root layout zaten <html>/<body> + tema sağlıyor; burada sadece children'ı
 * pas geçiyoruz. Bu sayede TeklifPrintDocument kendi page-stilini özgürce
 * uygular ve hidratasyon çakışması olmaz.
 */
export default function TeklifPrintLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <>{children}</>;
}
