/** @type {import('next').NextConfig} */
const nextConfig = {
  // Configure image domains based on environment
  images: {
    domains: ['res.cloudinary.com'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
        port: '',
        pathname: '/**',
      }
    ]
  },
  // Optimize build performance
  swcMinify: true,
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
  // Reduce bundle size
  webpack: (config, { dev, isServer }) => {
    if (!dev && !isServer) {
      config.optimization.splitChunks.chunks = 'all';
    }
    return config;
  },
  // Experimental features for better performance
  experimental: {
    scrollRestoration: true,
  },
  // Output standalone for better deployment (commented out for Vercel)
  // output: 'standalone',
}

module.exports = nextConfig
