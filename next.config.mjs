/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    unoptimized: true,
  },
  experimental: {
    serverComponentsExternalPackages: ["tesseract.js", "@prisma/client", "prisma"],
  },
};

export default nextConfig;
