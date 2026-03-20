import type { NextConfig } from "next";

function normalizeDocsOrigin(value: string | undefined) {
  if (!value) {
    return null;
  }

  return value.endsWith("/") ? value.slice(0, -1) : value;
}

const nextConfig: NextConfig = {
  reactCompiler: true,
  async rewrites() {
    const docsOrigin = normalizeDocsOrigin(process.env.MINTLIFY_DOCS_ORIGIN);

    if (!docsOrigin) {
      return [];
    }

    return [
      {
        source: "/.well-known/vercel/:match*",
        destination: `${docsOrigin}/.well-known/vercel/:match*`,
      },
      {
        source: "/docs",
        destination: `${docsOrigin}/docs`,
      },
      {
        source: "/docs/:match*",
        destination: `${docsOrigin}/docs/:match*`,
      },
    ];
  },
};

export default nextConfig;
