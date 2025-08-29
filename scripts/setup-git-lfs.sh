#!/bin/bash

# Git LFS Setup Script for Pet Detective Images
# This moves large images to Git LFS to speed up builds

echo "🚀 Setting up Git LFS for Pet Detective images..."

# 1. Install Git LFS (if not already installed)
if ! command -v git-lfs &> /dev/null; then
    echo "📦 Installing Git LFS..."
    # macOS
    if command -v brew &> /dev/null; then
        brew install git-lfs
    # Ubuntu/Debian
    elif command -v apt &> /dev/null; then
        sudo apt install git-lfs
    else
        echo "❌ Please install Git LFS manually: https://git-lfs.github.io/"
        exit 1
    fi
fi

# 2. Initialize Git LFS in your repo
echo "🔧 Initializing Git LFS..."
git lfs install

# 3. Track image files and models with LFS
echo "📸 Tracking image files with Git LFS..."
git lfs track "images/*.jpg"
git lfs track "images/*.jpeg" 
git lfs track "images/*.png"
git lfs track "images/*.gif"
git lfs track "images/*.webp"
git lfs track "images/*.bmp"
git lfs track "images/*.mat"

echo "🤖 Tracking model files with Git LFS..."
git lfs track "models/*.safetensors"
git lfs track "models/*.pth"
git lfs track "models/*.pt" 
git lfs track "models/*.pkl"
git lfs track "models/*.bin"
git lfs track "models/*.h5"
git lfs track "api/models/*.safetensors"
git lfs track "api/models/*.pth"
git lfs track "api/models/*.pt"

# 4. Add .gitattributes to track these rules
echo "📝 Adding .gitattributes..."
git add .gitattributes

# 5. Check current repo size
echo "📊 Current repository stats:"
echo "Total files in images/: $(ls images/ | wc -l)"
echo "Images directory size: $(du -sh images/)"
echo "Models directory size: $(du -sh models/ 2>/dev/null || echo 'Models directory not found')"
echo ""
echo "🔍 Files that will be moved to Git LFS:"
echo "Images: $(find images/ -type f \( -name "*.jpg" -o -name "*.jpeg" -o -name "*.png" -o -name "*.gif" -o -name "*.webp" -o -name "*.bmp" -o -name "*.mat" \) | wc -l) files"
echo "Models: $(find models/ -type f \( -name "*.safetensors" -o -name "*.pth" -o -name "*.pt" -o -name "*.pkl" -o -name "*.bin" -o -name "*.h5" \) 2>/dev/null | wc -l) files"

# 6. Migrate existing files to LFS
echo "🔄 Migrating existing images and models to Git LFS..."
git lfs migrate import --include="*.jpg,*.jpeg,*.png,*.gif,*.webp,*.bmp,*.mat,*.safetensors,*.pth,*.pt,*.pkl,*.bin,*.h5" --include-ref=refs/heads/main

echo "✅ Git LFS setup complete!"
echo ""
echo "📋 What this does:"
echo "• ALL IMAGES (7,393 files, 774MB) are stored in Git LFS"
echo "• ALL MODEL FILES (.safetensors, .pth, etc.) are stored in Git LFS"
echo "• Builds only download metadata (tiny pointer files)"
echo "• Large files are downloaded on-demand when needed"
echo "• GitHub provides 1GB LFS storage + 1GB bandwidth FREE"
echo "• Your total usage: ~774MB + models (well under 1GB limit)"
echo ""
echo "🎯 Next steps:"
echo "1. git add ."
echo "2. git commit -m 'feat: migrate images to Git LFS for faster builds'"
echo "3. git push origin main"
echo ""
echo "💡 Build times should be MUCH faster now!"
