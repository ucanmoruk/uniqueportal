import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { Toaster } from "sonner";
import { ThemeProvider } from "@/components/theme-provider";
import "./globals.css";

/**
 * UNIQUE Design Tokens, sans aileyi TT Interphases Pro olarak tanımlar.
 * TT Interphases Pro Google Fonts'ta yok (özel lisans). Lisans temin
 * edilince /public/fonts/ altına yüklenip @font-face ile değiştirilecek.
 *
 * Şimdilik geometrik fallback: Inter (Google) → system-ui.
 * Mono daima JetBrains Mono.
 */
const inter = Inter({
  variable: "--font-sans-fallback",
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600", "700"],
});

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
      className={`${inter.variable} ${jetbrains.variable} h-full antialiased`}
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
