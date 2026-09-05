import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Produces a minimal Node.js server suitable for the production Docker image.
  output: "standalone",
};

export default nextConfig;
