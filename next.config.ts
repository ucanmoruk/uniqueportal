import type { NextConfig } from "next";
import path from "node:path";

/**
 * Güvenlik HTTP başlıkları — tüm rotalara uygulanır.
 * - X-Frame-Options: clickjacking koruması (portal iframe'e gömülemez)
 * - X-Content-Type-Options: MIME-sniffing engeli
 * - Referrer-Policy: dış sitelere tam URL sızdırmaz
 * - Permissions-Policy: gereksiz tarayıcı API'lerini kapatır
 * - HSTS: yalnızca HTTPS (production reverse-proxy arkasında etkin)
 */
const securityHeaders = [
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
];

const nextConfig: NextConfig = {
  turbopack: {
    root: path.join(__dirname),
  },
  serverExternalPackages: ["mssql", "tedious"],
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
