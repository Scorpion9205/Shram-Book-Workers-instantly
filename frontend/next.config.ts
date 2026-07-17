import type { NextConfig } from "next";

const allowedDevOrigins = ["http://localhost:3000"];

const nextConfig: NextConfig = {
  /* config options here */
  allowedDevOrigins
};

export default nextConfig;
