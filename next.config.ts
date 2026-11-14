import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // A provider error must reach the response status before metadata is flushed.
  // Pair this with no global loading.tsx boundary around required CDA reads.
  htmlLimitedBots: /.*/,
  // Enable experimental features for better performance
  experimental: {
    optimizePackageImports: ["@storyblok/react", "framer-motion"],
    // CDA collection reads have a smaller origin quota than single stories.
    // Keep build workers bounded; the transport also paces requests per process.
    cpus: 1,
    staticGenerationMaxConcurrency: 2,
  },
  turbopack: {},

  // Enhanced image optimization configuration
  images: {
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
              `script-src 'self' 'unsafe-inline'${process.env.NODE_ENV === "development" ? " 'unsafe-eval'" : ""} https://www.googletagmanager.com https://www.google-analytics.com https://a.storyblok.com https://app.storyblok.com https://www.google.com https://www.gstatic.com; frame-src https://www.google.com; frame-ancestors 'self' https://app.storyblok.com`,
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
            value: "private, no-store, max-age=0",
          },
        ],
      },
      ...["/api/draft", "/api/revalidate", "/live-preview/:path*"].map((source) => ({
        source,
        headers: [
          { key: "Cache-Control", value: "private, no-store, max-age=0" },
          { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" },
          { key: "Referrer-Policy", value: "no-referrer" },
        ],
      })),
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
