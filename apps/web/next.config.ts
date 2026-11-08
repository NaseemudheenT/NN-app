import type { NextConfig } from "next";
import { fileURLToPath } from "node:url";

const config: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  typedRoutes: true,
  // An unrelated package-lock.json in the home directory makes Next infer the
  // wrong workspace root. Pin it to this repository.
  outputFileTracingRoot: fileURLToPath(new URL("../../", import.meta.url)),
};

export default config;
