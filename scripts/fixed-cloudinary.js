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
    
    this.imagesDir = path.join(__dirname, '..', 'temp_images_test')
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
    console.log('🚀 Starting Cloudinary migration...')
    console.log(`📁 Source: ${this.imagesDir}`)
    console.log(`☁️ Cloudinary Cloud: ${process.env.CLOUDINARY_CLOUD_NAME}\n`)

    const files = fs.readdirSync(this.imagesDir)
    const imageFiles = files.filter(file => 
      /\.(jpg|jpeg|png|webp|gif|bmp)$/i.test(file)
    )

    console.log(`📊 Found ${imageFiles.length} image files to upload\n`)

    const urlMappings = {}
    const batchSize = 3
    
    for (let i = 0; i < imageFiles.length; i += batchSize) {
      const batch = imageFiles.slice(i, i + batchSize)
      console.log(`🔄 Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(imageFiles.length/batchSize)}`)
      
      const promises = batch.map(async (fileName) => {
        const filePath = path.join(this.imagesDir, fileName)
        const result = await this.uploadImageToCloudinary(filePath, fileName)
        if (result) {
          urlMappings[fileName] = result
        }
      })
      
      await Promise.all(promises)
      
      if (i + batchSize < imageFiles.length) {
        await new Promise(resolve => setTimeout(resolve, 500))
      }
    }

    fs.writeFileSync(
      path.join(__dirname, 'cloudinary-mappings.json'),
      JSON.stringify(urlMappings, null, 2)
    )

    console.log('\n📊 Migration Summary:')
    console.log(`✅ Successfully uploaded: ${this.uploadedCount} files`)
    console.log(`❌ Failed uploads: ${this.failedCount} files`)
    
    if (this.uploadedCount > 0) {
      console.log('\n🎉 Test migration successful! Ready for full migration.')
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
