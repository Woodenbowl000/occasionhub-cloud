/** @type {import('next').NextConfig} */
const nextConfig = {
  // Self-contained server bundle (.next/standalone) with only the files the
  // app needs at runtime: keeps the container image small and fast to pull.
  output: "standalone",
  // Nginx in front of Next.js does gzip, so Node does not spend CPU on it.
  compress: false,
  poweredByHeader: false,
  images: {
    remotePatterns: [{ protocol: "https", hostname: "images.unsplash.com" }],
  },
};

module.exports = nextConfig;
