import { NextRequest, NextResponse } from "next/server";

const LOCAL_HOSTNAMES = new Set(["127.0.0.1", "::1", "localhost"]);

const headers = {
  "cache-control": "no-store, no-cache, must-revalidate, proxy-revalidate",
  "content-type": "text/plain; charset=utf-8",
  "retry-after": "3600",
};

export function proxy(request: NextRequest) {
  if (
    process.env.NODE_ENV !== "production" ||
    LOCAL_HOSTNAMES.has(request.nextUrl.hostname)
  ) {
    return NextResponse.next();
  }

  return new NextResponse("Service Unavailable", {
    status: 503,
    headers,
  });
}

export const config = {
  matcher: ["/", "/:path*"],
};
