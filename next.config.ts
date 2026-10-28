import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Four product views, each capped and decoded separately on the server.
    serverActions: { bodySizeLimit: "21mb" },
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "kmvnqympemtivxxlmcvu.supabase.co",
      },
    ],
  },
};

export default nextConfig;
