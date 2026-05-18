import type { NextConfig } from "next";

const apiUrl =
  process.env.NEXT_PUBLIC_API_URL
  ?? process.env.NEXT_PUBLIC_API_URL_LOCAL
  ?? "http://localhost:8000";

const nextConfig: NextConfig = {
  images: {
    qualities: [100, 75],
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
  },
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${apiUrl}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
