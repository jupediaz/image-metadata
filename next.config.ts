import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  serverExternalPackages: ['sharp'],
  reactStrictMode: false, // Disabled: strict mode double-fires effects, causing Fabric.js canvas disposal race conditions
};

export default nextConfig;
