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
  // Prince reads knowledge/*.md at runtime; make sure they ship with the serverless function.
  outputFileTracingIncludes: {
    "/api/prince": ["./knowledge/**/*"],
  },
};

export default nextConfig;
