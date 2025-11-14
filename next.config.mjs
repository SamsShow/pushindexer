/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@pushchain/x402-sdk'],
  // Fix Vercel serverless function bundling issues
  serverExternalPackages: ['pg', '@pushchain/core'],
  // Disable Turbopack for now to use webpack (better compatibility)
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

