const nextConfig = {
  typescript: {
    // Ignore strict type errors during production builds
    ignoreBuildErrors: true,
  },
  eslint: {
    // Bypass formatting and linting warnings during production builds
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;