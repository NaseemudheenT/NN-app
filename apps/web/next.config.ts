import type { NextConfig } from "next";
import { fileURLToPath } from "node:url";

const config: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  typedRoutes: true,
  // The workspace packages ship TypeScript source rather than a build output,
  // so Next must compile them alongside the app. All three are listed: each
  // has "main": "./src/index.ts" and no build step, and omitting one happens
  // to work locally only because of how pnpm links it here.
  transpilePackages: ["@nn/firebase", "@nn/security", "@nn/auth"],
  // An unrelated package-lock.json in the home directory makes Next infer the
  // wrong workspace root. Pin it to this repository.
  outputFileTracingRoot: fileURLToPath(new URL("../../", import.meta.url)),
};

export default config;
