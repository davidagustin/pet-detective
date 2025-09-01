#!/bin/bash

echo "🚀 Deploying Pet Detective API routes to Vercel..."

# Clean previous build
echo "🧹 Cleaning previous build..."
rm -rf .next
rm -rf out

# Create minimal build for API routes only
echo "🔨 Building API routes..."
NODE_ENV=production npx next build --no-lint --no-typecheck

# Deploy to Vercel
echo "📤 Deploying to Vercel..."
npx vercel --prod --yes

echo "✅ Deployment completed!"
echo "🌐 Your API routes should now be available at:"
echo "   - https://pet-detective.vercel.app/api/game/start"
echo "   - https://pet-detective.vercel.app/api/health"
