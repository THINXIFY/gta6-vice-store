import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

// The e2e suite builds with checkout in test mode into its own folder (scripts/e2e.mjs). A test-mode
// build in the normal .next folder could be started or deployed by mistake, so it is refused.
const distDir = process.env.NEXT_DIST_DIR || ".next";
if (process.env.NEXT_PUBLIC_CHECKOUT_TEST_MODE === "1" && distDir === ".next") {
  throw new Error("NEXT_PUBLIC_CHECKOUT_TEST_MODE=1 is only for the isolated e2e build (npm run test:e2e).");
}

const nextConfig: NextConfig = {
  distDir,
  poweredByHeader: false,
  // Dev only: Next's MCP server writes every browser/server log line to .next/dev/logs, and the dev
  // watcher on this machine treated each write as a change (rebuild + page reload, in a loop).
  experimental: { mcpServer: false },
  logging: { browserToTerminal: false },
  // PGlite ships WASM/data files that must be loaded from node_modules, not bundled.
  serverExternalPackages: ["@electric-sql/pglite"],
  images: { formats: ["image/avif", "image/webp"] },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
