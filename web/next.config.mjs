/** @type {import('next').NextConfig} */

// Content-Security-Policy scoped to the origins this dapp actually talks to:
// Monad testnet RPC + the WalletConnect/Reown relay & explorer APIs. `frame-ancestors 'none'`
// is the clickjacking guard for the connect/approve/commit flow. `'unsafe-inline'` is required
// for Next 14's inline bootstrap scripts and RainbowKit's injected styles without a nonce;
// tightening script-src to a per-request nonce (via middleware) is a follow-up. Validate against
// a live wallet connect before relying on it — an over-tight CSP silently breaks WalletConnect.
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: https:",
  "font-src 'self' data:",
  "connect-src 'self' https://testnet-rpc.monad.xyz https://*.monad.xyz https://*.walletconnect.com https://*.walletconnect.org wss://*.walletconnect.com wss://*.walletconnect.org https://*.web3modal.org https://*.reown.com",
  "frame-src 'self' https://*.walletconnect.com https://*.walletconnect.org",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig = {
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  webpack: (config) => {
    // Optional deps pulled in transitively by WalletConnect/wagmi that aren't installed.
    config.externals.push("pino-pretty", "lokijs", "encoding");
    return config;
  },
};

export default nextConfig;
