import { NextResponse } from "next/server";

const headers = {
  "cache-control": "no-store, no-cache, must-revalidate, proxy-revalidate",
  "content-type": "text/plain; charset=utf-8",
  "retry-after": "3600",
};

export function proxy() {
  return new NextResponse("Service Unavailable", {
    status: 503,
    headers,
  });
}

export const config = {
  matcher: ["/", "/:path*"],
};
