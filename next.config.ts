import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable experimental features for better performance
  experimental: {
    optimizePackageImports: ["@storyblok/react", "framer-motion"],
  },
  turbopack: {},

  // Enhanced image optimization configuration
  images: {
    domains: ["a-us.storyblok.com", "img2.storyblok.com"],
    minimumCacheTTL: 60 * 60 * 24, // 24 hours
    formats: ["image/webp", "image/avif"],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    // Enhanced optimization settings
    unoptimized: false,
    loader: "default",
    // Custom loader for Storyblok images
    remotePatterns: [
      {
        protocol: "https",
        hostname: "a-us.storyblok.com",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "img2.storyblok.com",
        port: "",
        pathname: "/**",
      },
    ],
  },

  // Compression and optimization
  compress: true,
  poweredByHeader: false,

  // Headers for better caching and security
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Content-Security-Policy",
            value:
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com https://www.google-analytics.com https://a.storyblok.com https://www.google.com https://www.gstatic.com; frame-src https://www.google.com",
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "origin-when-cross-origin",
          },
        ],
      },
      {
        source: "/api/(.*)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=0, s-maxage=86400",
          },
        ],
      },
      {
        source: "/_next/static/(.*)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
    ];
  },

  // Webpack optimization
  webpack: (config, { dev, isServer }) => {
    // Optimize bundle size
    if (!dev && !isServer) {
      config.optimization.splitChunks = {
        chunks: "all",
        cacheGroups: {
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: "vendors",
            chunks: "all",
          },
          storyblok: {
            test: /[\\/]node_modules[\\/]@storyblok[\\/]/,
            name: "storyblok",
            chunks: "all",
            priority: 10,
          },
        },
      };
    }
    return config;
  },

  // Redirects for better SEO
  async redirects() {
    return [
      {
        source: "/home",
        destination: "/",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
