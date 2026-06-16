import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "@/lib/auth.config";

// Edge runtime ile uyumlu olması için MSSQL'e bağımlı olan
// `lib/auth.ts` yerine sadece `authConfig`'i kullanıyoruz.
const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const { pathname } = req.nextUrl;

  const isAuthPage = pathname === "/giris";
  const isApiAuth = pathname.startsWith("/api/auth");
  const isPublicApi = pathname.startsWith("/api/public-");
  const isPublic =
    pathname === "/" ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/logo") ||
    isApiAuth ||
    isPublicApi;

  if (isAuthPage) {
    if (isLoggedIn) {
      return NextResponse.redirect(new URL("/ozet", req.nextUrl));
    }
    return NextResponse.next();
  }

  if (isPublic) return NextResponse.next();

  if (!isLoggedIn) {
    const url = new URL("/giris", req.nextUrl);
    if (pathname !== "/") url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
});

export const config = {
  // Public statik assetleri middleware'in dışında tut
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.png|.*\\.jpg|.*\\.jpeg|.*\\.svg|.*\\.webp|.*\\.gif|.*\\.ico).*)",
  ],
};
