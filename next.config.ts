import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  // No rewrites needed — the catch-all route at app/[...slug]/page.tsx
  // handles all QR type URLs with proper server-side SEO metadata.
};

export default nextConfig;
