#!/usr/bin/env node

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
    
    this.imagesDir = path.join(__dirname, '..', 'images')
    this.uploadedCount = 0
    this.failedCount = 0
  }

  async uploadImageToCloudinary(filePath, fileName) {
    try {
      // Extract breed and animal type from filename
      const baseName = path.basename(fileName, path.extname(fileName))
      const parts = baseName.split('_')
      const breed = parts.slice(0, -1).join('_')
      
      const result = await cloudinary.uploader.upload(filePath, {
        public_id: `pet-detective/${baseName}`,
        folder: 'pet-detective',
        resource_type: 'image',
        quality: 'auto',
        tags: ['pet-detective', breed],
        context: {
          breed: breed,
          original_filename: fileName
        }
      })

      console.log(`✅ Uploaded: ${fileName}`)
      this.uploadedCount++
      return {
        originalName: fileName,
        publicId: result.public_id,
        secureUrl: result.secure_url,
        optimizedUrl: cloudinary.url(result.public_id, {
          width: 800,
          height: 600,
          crop: 'fill',
          quality: 'auto'
        })
      }
      
    } catch (error) {
      console.error(`❌ Failed to upload ${fileName}:`, error.message)
      this.failedCount++
      return null
    }
  }

  async migrateAllImages() {
    console.log('🚀 Starting FULL Cloudinary migration...')
    console.log(`📁 Source: ${this.imagesDir}`)
    console.log(`☁️ Cloudinary Cloud: ${process.env.CLOUDINARY_CLOUD_NAME}\n`)

    const files = fs.readdirSync(this.imagesDir)
    const imageFiles = files.filter(file => 
      /\.(jpg|jpeg|png|webp|gif|bmp)$/i.test(file)
    )

    console.log(`📊 Found ${imageFiles.length} image files to upload`)
    console.log(`⚠️  This will take approximately ${Math.round(imageFiles.length / 60)} minutes\n`)

    const urlMappings = {}
    const batchSize = 10 // Larger batches for efficiency
    
    for (let i = 0; i < imageFiles.length; i += batchSize) {
      const batch = imageFiles.slice(i, i + batchSize)
      const batchNum = Math.floor(i/batchSize) + 1
      const totalBatches = Math.ceil(imageFiles.length/batchSize)
      
      console.log(`🔄 Processing batch ${batchNum}/${totalBatches} (${this.uploadedCount}/${imageFiles.length} completed)`)
      
      const promises = batch.map(async (fileName) => {
        const filePath = path.join(this.imagesDir, fileName)
        const result = await this.uploadImageToCloudinary(filePath, fileName)
        if (result) {
          urlMappings[fileName] = result
        }
      })
      
      await Promise.all(promises)
      
      // Progress update every 50 batches
      if (batchNum % 50 === 0) {
        console.log(`📈 Progress: ${this.uploadedCount}/${imageFiles.length} (${Math.round(this.uploadedCount/imageFiles.length*100)}%)`)
      }
      
      // Small delay to respect rate limits
      if (i + batchSize < imageFiles.length) {
        await new Promise(resolve => setTimeout(resolve, 200))
      }
    }

    // Save URL mappings
    fs.writeFileSync(
      path.join(__dirname, 'cloudinary-mappings.json'),
      JSON.stringify(urlMappings, null, 2)
    )

    console.log('\n🎉 MIGRATION COMPLETE!')
    console.log('📊 Final Summary:')
    console.log(`✅ Successfully uploaded: ${this.uploadedCount} files`)
    console.log(`❌ Failed uploads: ${this.failedCount} files`)
    console.log(`💾 URL mappings saved to: scripts/cloudinary-mappings.json`)
    
    if (this.uploadedCount > 0) {
      console.log('\n🌟 Your images are now hosted on Cloudinary!')
      console.log('Benefits you now have:')
      console.log('• Global CDN for fast delivery worldwide')
      console.log('• Automatic image optimization')
      console.log('• On-the-fly resizing and transformations')
      console.log('• Reduced deployment size (no more 7GB of images!)')
      console.log('\n📋 Next steps:')
      console.log('1. Update your code to use Cloudinary URLs')
      console.log('2. Add images/ to .vercelignore')
      console.log('3. Redeploy - your builds will be MUCH faster!')
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

if (!process.env.CLOUDINARY_CLOUD_NAME) {
  console.log('⚠️  Cloudinary credentials not found.')
  process.exit(1)
}

const migrator = new CloudinaryImageMigrator()
migrator.run()
