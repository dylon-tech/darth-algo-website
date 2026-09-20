import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingRoot: process.cwd(),
  images: {
    unoptimized: true,
  },
  reactStrictMode: true,
  serverExternalPackages: ["playwright-core"],
};

export default nextConfig;
