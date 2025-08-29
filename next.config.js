/** @type {import('next').NextConfig} */
const nextConfig = {
  // Remove rewrites to avoid conflicts with Flask API
  // The Flask API will handle /api/* routes directly
  experimental: {
    appDir: true,
  },
  // Configure image domains based on environment
  images: {
    domains: process.env.NODE_ENV === 'development' 
      ? ['localhost', '127.0.0.1'] 
      : (process.env.NEXT_PUBLIC_IMAGE_DOMAINS || '').split(',').filter(Boolean),
  },
}

module.exports = nextConfig
