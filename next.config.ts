import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  basePath: "/bitacora",
  allowedDevOrigins: ["127.0.0.1", "localhost", "10.0.0.171", "190.167.123.23"],
  output: "standalone",
};

export default nextConfig;
