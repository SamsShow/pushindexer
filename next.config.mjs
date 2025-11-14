/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@pushchain/x402-sdk'],
  // Fix Vercel serverless function bundling issues
  serverExternalPackages: ['pg', '@pushchain/core'],
  // Use webpack instead of Turbopack for better compatibility
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
  // Silence Turbopack warning since we're using webpack
  turbopack: {},
}

export default nextConfig

