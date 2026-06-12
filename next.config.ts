import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    // This tells Next.js to ignore strict type errors during production builds
    ignoreBuildErrors: true,
  },
  eslint: {
    // This will bypass formatting and linting warnings during production builds
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;