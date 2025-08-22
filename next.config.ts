import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    experimental: {
        optimizePackageImports: ["@chakra-ui/react"],
    },
    output: 'export',
    basePath: process.env.PAGES_BASE_PATH,
};

export default nextConfig;
