/** @type {import('next').NextConfig} */
const nextConfig = {
  // Remove rewrites to avoid conflicts with Flask API
  // The Flask API will handle /api/* routes directly
  experimental: {
    appDir: true,
  },
  // Ensure proper static file handling
  images: {
    domains: ['localhost'],
  },
}

module.exports = nextConfig
