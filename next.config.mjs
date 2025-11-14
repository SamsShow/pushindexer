/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@pushchain/x402-sdk'],
  // Fix Vercel serverless function bundling issues
  experimental: {
    serverComponentsExternalPackages: ['pg', '@pushchain/core'],
  },
}

export default nextConfig

