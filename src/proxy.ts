import { NextResponse, type NextRequest } from "next/server";
import { getSetupStatus } from "@/lib/db-init";

const PUBLIC_PATHS = [
  "/login",
  "/setup",
  "/api/auth",
  "/api/health",
  "/api/setup",
];

const PUBLIC_PREFIXES = ["/_next", "/favicon.ico"];

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (PUBLIC_PREFIXES.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
    return NextResponse.next();
  }

  try {
    const status = await getSetupStatus();
    if (status.needsSetup) {
      const url = req.nextUrl.clone();
      url.pathname = "/setup";
      return NextResponse.redirect(url);
    }
  } catch {
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
