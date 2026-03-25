/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  output: 'standalone',
  async rewrites() {
    const backend = process.env.BACKEND_URL || 'http://localhost:63292'
    return [
      {
        source: '/api/:path*',
        destination: `${backend}/api/:path*`,
      },
      {
        source: '/health/:path*',
        destination: `${backend}/health/:path*`,
      },
      {
        source: '/ws/:path*',
        destination: `${backend}/ws/:path*`,
      },
    ]
  },
}

module.exports = nextConfig
