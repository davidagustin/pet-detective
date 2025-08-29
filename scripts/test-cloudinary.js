#!/usr/bin/env node

/**
 * Migrate Images to Cloudinary
 * 
 * Cloudinary is perfect for temp_images_test with automatic optimization, resizing, and CDN.
 * It has a generous free tier and excellent performance.
 * 
 * Prerequisites:
 * 1. Install Cloudinary SDK: npm install cloudinary
 * 2. Sign up for Cloudinary account (free tier: 25 credits/month, 25GB storage)
 * 3. Get your credentials from Cloudinary dashboard
 * 
 * Usage: node scripts/migrate-to-cloudinary.js
 */

const cloudinary = require('cloudinary').v2
const fs = require('fs')
const path = require('path')

class CloudinaryImageMigrator {
  constructor() {
    // Configure Cloudinary
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET
    })
    
    this.temp_images_testDir = path.join(__dirname, '..', 'temp_images_test')
    this.uploadedCount = 0
    this.failedCount = 0
  }

  async uploadImageToCloudinary(filePath, fileName) {
    try {
      // Extract breed and animal type from filename
      const baseName = path.basename(fileName, path.extname(fileName))
      const parts = baseName.split('_')
      const breed = parts.slice(0, -1).join('_') // Everything except the last part (number)
      
      const result = await cloudinary.uploader.upload(filePath, {
        public_id: `pet-detective/${baseName}`,
        folder: 'pet-detective',
        resource_type: 'image',
        format: 'auto', // Auto-optimize format (WebP when supported)
        quality: 'auto', // Auto-optimize quality
        fetch_format: 'auto',
        tags: ['pet-detective', breed],
        context: {
          breed: breed,
          original_filename: fileName
        }
      })

      console.log(`✅ Uploaded: ${fileName} -> ${result.secure_url}`)
      this.uploadedCount++
      return {
        originalName: fileName,
        publicId: result.public_id,
        secureUrl: result.secure_url,
        optimizedUrl: cloudinary.url(result.public_id, {
          width: 800,
          height: 600,
          crop: 'fill',
          quality: 'auto',
          fetch_format: 'auto'
        })
      }
      
    } catch (error) {
      console.error(`❌ Failed to upload ${fileName}:`, error.message)
      this.failedCount++
      return null
    }
  }

  async migrateAllImages() {
    console.log('🚀 Starting Cloudinary migration...')
    console.log(`📁 Source: ${this.temp_images_testDir}`)
    console.log(`☁️ Cloudinary Cloud: ${process.env.CLOUDINARY_CLOUD_NAME}\n`)

    const files = fs.readdirSync(this.temp_images_testDir)
    const imageFiles = files.filter(file => 
      /\.(jpg|jpeg|png|webp|gif|bmp)$/i.test(file)
    )

    console.log(`📊 Found ${imageFiles.length} image files to upload\n`)

    const urlMappings = {}
    const batchSize = 5 // Cloudinary rate limits, so smaller batches
    
    for (let i = 0; i < imageFiles.length; i += batchSize) {
      const batch = imageFiles.slice(i, i + batchSize)
      console.log(`🔄 Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(imageFiles.length/batchSize)}`)
      
      const promises = batch.map(async (fileName) => {
        const filePath = path.join(this.temp_images_testDir, fileName)
        const result = await this.uploadImageToCloudinary(filePath, fileName)
        if (result) {
          urlMappings[fileName] = result
        }
      })
      
      await Promise.all(promises)
      
      // Delay to respect rate limits
      if (i + batchSize < imageFiles.length) {
        await new Promise(resolve => setTimeout(resolve, 500))
      }
    }

    // Save URL mappings
    fs.writeFileSync(
      path.join(__dirname, 'cloudinary-mappings.json'),
      JSON.stringify(urlMappings, null, 2)
    )

    console.log('\n📊 Migration Summary:')
    console.log(`✅ Successfully uploaded: ${this.uploadedCount} files`)
    console.log(`❌ Failed uploads: ${this.failedCount} files`)
    console.log(`💾 URL mappings saved to: scripts/cloudinary-mappings.json`)
    
    if (this.uploadedCount > 0) {
      console.log('\n🎉 Migration completed! Benefits of Cloudinary:')
      console.log('• Automatic image optimization (WebP, AVIF)')
      console.log('• On-the-fly resizing and cropping')
      console.log('• Global CDN for fast delivery')
      console.log('• Automatic quality optimization')
      console.log('\nNext steps:')
      console.log('1. Update your API to use Cloudinary URLs')
      console.log('2. Implement responsive temp_images_test with Cloudinary transformations')
      console.log('3. Remove local temp_images_test/ folder from git')
    }
  }

  async run() {
    try {
      await this.migrateAllImages()
    } catch (error) {
      console.error('💥 Migration failed:', error)
      process.exit(1)
    }
  }
}

// Environment variable check
if (!process.env.CLOUDINARY_CLOUD_NAME) {
  console.log('⚠️  Cloudinary credentials not found. Please set these environment variables:')
  console.log('   CLOUDINARY_CLOUD_NAME=your_cloud_name')
  console.log('   CLOUDINARY_API_KEY=your_api_key')
  console.log('   CLOUDINARY_API_SECRET=your_api_secret')
  console.log('\n📝 Get these from: https://cloudinary.com/console')
  process.exit(1)
}

const migrator = new CloudinaryImageMigrator()
migrator.run()
