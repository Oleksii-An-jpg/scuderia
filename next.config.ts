import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    experimental: {
        optimizePackageImports: ["@chakra-ui/react"],
    },
    async rewrites() {
        return [
            {
                source: '/admin',
                destination: '/admin/vehicles',
            },
        ]
    },
    async redirects() {
        return [
            {
                source: '/admin',
                destination: '/admin/vehicles',
                permanent: true,
            },
        ]
    },
    basePath: process.env.PAGES_BASE_PATH,
};

export default nextConfig;
