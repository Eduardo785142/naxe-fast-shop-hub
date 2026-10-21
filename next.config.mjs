/** @type {import('next').NextConfig} */
const config = {
  poweredByHeader: false,
  output: "standalone",
  outputFileTracingIncludes: {
    "/*": ["./prisma/migrations/**/*", "./node_modules/.prisma/client/**/*", "./certificates/*.crt"],
  },
  eslint: { dirs: ["app", "live", "server", "prisma", "tests"] },
  experimental: { cpus: 2 },
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${process.env.API_INTERNAL_URL ?? "http://127.0.0.1:4000"}/api/:path*`,
      },
      {
        source: "/socket.io/:path*",
        destination: `${process.env.API_INTERNAL_URL ?? "http://127.0.0.1:4000"}/socket.io/:path*`,
      },
    ];
  },
};
export default config;
