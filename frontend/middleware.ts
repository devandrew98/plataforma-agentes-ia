import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Protege tudo que estiver no grupo (app)
  const isAppRoute =
    pathname.startsWith("/dashboard") || pathname.startsWith("/agentes");

  if (!isAppRoute) return NextResponse.next();

  const session = req.cookies.get("session")?.value;

  if (!session) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/agentes/:path*"],
};