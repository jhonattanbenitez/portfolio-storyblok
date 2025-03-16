/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ["a-us.storyblok.com"], // Add Storyblok domain
    minimumCacheTTL: 60 * 60 * 24, // 24 hours
  },
};

export default nextConfig;
