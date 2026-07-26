import type { NextConfig } from 'next'

// same role as the old vite.config.js proxy block: forward api calls to the
// go backend so the browser only ever talks to this app's own origin
const API_BASE = process.env.API_BASE_URL || 'https://api.tseccodecell.com'

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      { source: '/api/:path*', destination: `${API_BASE}/api/:path*` },
      { source: '/admin/login', destination: `${API_BASE}/admin/login` },
      { source: '/weeks', destination: `${API_BASE}/weeks` },
      { source: '/weeks/:path*', destination: `${API_BASE}/weeks/:path*` },
      { source: '/run', destination: `${API_BASE}/run` },
    ]
  },
  images: {
    remotePatterns: [{ protocol: 'https', hostname: 'ik.imagekit.io' }],
  },
}

export default nextConfig
