/** @type {import('next').NextConfig} */
const nextConfig = {
  // Remove rewrites for production deployment
  // API calls should be made directly to the Flask backend
  experimental: {
    appDir: true,
  },
  // Ensure proper static file handling
  images: {
    domains: ['localhost'],
  },
}

module.exports = nextConfig
