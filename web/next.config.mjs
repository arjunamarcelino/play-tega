/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config) => {
    // Optional deps pulled in transitively by WalletConnect/wagmi that aren't installed.
    config.externals.push("pino-pretty", "lokijs", "encoding");
    return config;
  },
};

export default nextConfig;
