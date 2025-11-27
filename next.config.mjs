/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@pushchain/x402-sdk', '@pushchain/core'],
  // Fix Vercel serverless function bundling issues
  // Note: @pushchain/core and ethers are browser-compatible, so NOT in serverExternalPackages
  serverExternalPackages: ['pg'],
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
    // Make @pushchain/core work in both client and server
    if (!isServer) {
      config.resolve = config.resolve || {};
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }
    return config;
  },
  // Silence Turbopack warning since we're using webpack
  turbopack: {},
}

export default nextConfig

