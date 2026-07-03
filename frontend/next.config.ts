import type { NextConfig } from "next";

const backendUrl = process.env.BACKEND_URL ?? "http://localhost:8080";
const { hostname, protocol, port } = new URL(backendUrl);

// The media/API host derived from BACKEND_URL, e.g. "http://localhost:8080".
// protocol already carries the trailing colon (e.g. "http:").
const backendOrigin = `${protocol}//${hostname}${port ? ":" + port : ""}`;

// Baseline Content-Security-Policy.
// NOTE: 'unsafe-inline' in script-src is required because Next.js hydration and
// next-themes inject inline scripts. Nonce-based CSP hardening (per-request nonce
// via middleware) is a documented follow-up. 'unsafe-inline' in style-src is
// required by Tailwind/shadcn and inline style={{ '--cat': ... }} usage.
const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${process.env.NODE_ENV !== "production" ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob: ${backendOrigin} http: https:`,
  "font-src 'self' data:",
  `connect-src 'self' ${backendOrigin} http: https: ws: wss:`,
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join("; ");

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  {
    key: "Strict-Transport-Security",
    value: "max-age=31536000; includeSubDomains; preload",
  },
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
];

// Local dev serves media from a localhost backend; Next 16's image optimizer
// blocks private-IP upstreams by default. Relax only when the host is local.
const isLocalBackend = hostname === "localhost" || hostname === "127.0.0.1";

const nextConfig: NextConfig = {
  output: "standalone",
  images: {
    ...(isLocalBackend ? { dangerouslyAllowLocalIP: true } : {}),
    remotePatterns: [
      {
        protocol: protocol.replace(":", "") as "http" | "https",
        hostname,
        port: port || undefined,
        pathname: "/uploads/**",
      },
    ],
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  async rewrites() {
    return [
      {
        source: "/uploads/:path*",
        destination: `${backendOrigin}/uploads/:path*`,
      },
    ];
  },
};

export default nextConfig;
