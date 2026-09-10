import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  turbopack: {
    root: path.join(__dirname),
  },
  // firebase-admin's auth module pulls in jwks-rsa -> jose, whose ESM build
  // Turbopack's server bundler can't require() correctly (ERR_REQUIRE_ESM).
  // Excluding it from bundling lets Node resolve it natively at runtime instead.
  serverExternalPackages: ["firebase-admin"],
};

export default nextConfig;
