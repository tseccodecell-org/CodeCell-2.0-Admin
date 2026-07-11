import type { NextConfig } from 'next'

// same role as the old vite.config.js proxy block: forward api calls to the
// go backend so the browser only ever talks to this app's own origin
const nextConfig: NextConfig = {
  async rewrites() {
    return [
      { source: '/api/:path*', destination: 'http://localhost:8000/api/:path*' },
      { source: '/weeks/:path*', destination: 'http://localhost:8000/weeks/:path*' },
      { source: '/run', destination: 'http://localhost:8000/run' },
    ]
  },
  images: {
    remotePatterns: [{ protocol: 'https', hostname: 'ik.imagekit.io' }],
  },
}

export default nextConfig
