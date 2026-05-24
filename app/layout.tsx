import type { Metadata } from "next";
import { JetBrains_Mono } from "next/font/google";
import { Toaster } from "sonner";
import { ThemeProvider } from "@/components/theme-provider";
import "./globals.css";

/**
 * Portal genelinde tek font ailesi: JetBrains Mono.
 * Hem sans hem mono semantic token'ları globals.css içinde buna bağlı.
 */
const jetbrains = JetBrains_Mono({
  variable: "--font-mono-fallback",
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "UNIQUE Services Portal",
  description: "Kozmetik test ve analiz hizmetleri portalı",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="tr"
      suppressHydrationWarning
      className={`${jetbrains.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem={false}
          disableTransitionOnChange
        >
          {children}
          <Toaster richColors position="top-right" />
        </ThemeProvider>
      </body>
    </html>
  );
}
