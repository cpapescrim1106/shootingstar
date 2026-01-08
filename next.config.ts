import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // Disable static optimization for API routes that need database
  experimental: {
    // Enable server actions for future use
  },
};

export default nextConfig;
