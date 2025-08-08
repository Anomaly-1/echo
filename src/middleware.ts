import { NextRequest, NextResponse } from "next/server";

export function middleware(req: NextRequest) {
  const url = req.nextUrl.clone();
  const isAuthPage = url.pathname.startsWith("/signin");

  // Heuristic: any cookie starting with "sb-" and ending with "-auth-token" indicates an active session
  const hasSbAuthCookie = req.cookies.getAll().some((c) => c.name.startsWith("sb-") && c.name.endsWith("-auth-token"));

  if (!hasSbAuthCookie && !isAuthPage && url.pathname === "/") {
    url.pathname = "/signin";
    return NextResponse.redirect(url);
  }

  if (hasSbAuthCookie && isAuthPage) {
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/signin"],
};


