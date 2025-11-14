/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@pushchain/x402-sdk'],
  // Fix Vercel serverless function bundling issues
  experimental: {
    serverComponentsExternalPackages: ['pg', '@pushchain/core'],
  },
  // Ensure API routes are properly compiled
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Ensure proper module resolution for serverless functions
      config.resolve = config.resolve || {};
      config.resolve.extensionAlias = {
        '.js': ['.ts', '.tsx', '.js', '.jsx'],
        '.jsx': ['.tsx', '.jsx'],
      };
    }
    return config;
  },
}

export default nextConfig

