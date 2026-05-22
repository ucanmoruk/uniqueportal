import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const { pathname } = req.nextUrl;

  const isAuthPage = pathname === "/giris";
  const isApiAuth = pathname.startsWith("/api/auth");
  const isPublic =
    pathname === "/" ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/logo") ||
    isApiAuth;

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
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.png|.*\\.jpg).*)"],
};
