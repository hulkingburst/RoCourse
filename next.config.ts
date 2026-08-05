import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The project lives inside the user's home directory, so tell Turbopack
  // where the actual project root is (avoids it scanning up to $HOME).
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
