import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Align with MAX_CONTENT_LENGTH (~1 MiB) plus JSON overhead.
    serverActions: {
      bodySizeLimit: "1.5mb",
    },
  },
};

export default nextConfig;
