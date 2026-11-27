import type { NextConfig } from "next";

const config: NextConfig = {
  reactStrictMode: true,
  // The player is a single static page plus static media; nothing is rendered per request.
  outputFileTracingRoot: process.cwd(),
};

export default config;
