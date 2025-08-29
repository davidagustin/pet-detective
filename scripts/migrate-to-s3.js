#!/usr/bin/env node

/**
 * Migrate Images to AWS S3
 * 
 * This script uploads all images from the local images/ folder to AWS S3
 * and updates your database/code to use S3 URLs instead of local paths.
 * 
 * Prerequisites:
 * 1. Install AWS SDK: npm install @aws-sdk/client-s3 @aws-sdk/lib-storage
 * 2. Set up AWS credentials (AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY)
 * 3. Create an S3 bucket
 * 
 * Usage: node scripts/migrate-to-s3.js
 */

const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3')
const { Upload } = require('@aws-sdk/lib-storage')
const fs = require('fs')
const path = require('path')

class S3ImageMigrator {
  constructor() {
    this.bucketName = process.env.AWS_S3_BUCKET || 'pet-detective-images'
    this.region = process.env.AWS_REGION || 'us-east-1'
    this.cdnDomain = process.env.AWS_CLOUDFRONT_DOMAIN // Optional CloudFront CDN
    
    this.s3Client = new S3Client({
      region: this.region,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
      }
    })
    
    this.imagesDir = path.join(__dirname, '..', 'images')
    this.uploadedCount = 0
    this.failedCount = 0
  }

  async uploadImageToS3(filePath, fileName) {
    try {
      const fileStream = fs.createReadStream(filePath)
      const fileExtension = path.extname(fileName).toLowerCase()
      
      // Determine content type
      const contentTypeMap = {
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.webp': 'image/webp',
        '.gif': 'image/gif'
      }
      
      const upload = new Upload({
        client: this.s3Client,
        params: {
          Bucket: this.bucketName,
          Key: `pet-images/${fileName}`,
          Body: fileStream,
          ContentType: contentTypeMap[fileExtension] || 'application/octet-stream',
          CacheControl: 'public, max-age=31536000', // 1 year cache
          Metadata: {
            'uploaded-by': 'pet-detective-migrator',
            'original-path': filePath
          }
        }
      })

      const result = await upload.done()
      const publicUrl = this.cdnDomain 
        ? `https://${this.cdnDomain}/pet-images/${fileName}`
        : `https://${this.bucketName}.s3.${this.region}.amazonaws.com/pet-images/${fileName}`
      
      console.log(`✅ Uploaded: ${fileName} -> ${publicUrl}`)
      this.uploadedCount++
      return publicUrl
      
    } catch (error) {
      console.error(`❌ Failed to upload ${fileName}:`, error.message)
      this.failedCount++
      return null
    }
  }

  async migrateAllImages() {
    console.log('🚀 Starting S3 migration...')
    console.log(`📁 Source: ${this.imagesDir}`)
    console.log(`🪣 S3 Bucket: ${this.bucketName}`)
    console.log(`🌍 Region: ${this.region}\n`)

    const files = fs.readdirSync(this.imagesDir)
    const imageFiles = files.filter(file => 
      /\.(jpg|jpeg|png|webp|gif)$/i.test(file)
    )

    console.log(`📊 Found ${imageFiles.length} image files to upload\n`)

    const urlMappings = {}
    const batchSize = 10 // Upload 10 files concurrently
    
    for (let i = 0; i < imageFiles.length; i += batchSize) {
      const batch = imageFiles.slice(i, i + batchSize)
      console.log(`🔄 Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(imageFiles.length/batchSize)}`)
      
      const promises = batch.map(async (fileName) => {
        const filePath = path.join(this.imagesDir, fileName)
        const s3Url = await this.uploadImageToS3(filePath, fileName)
        if (s3Url) {
          urlMappings[fileName] = s3Url
        }
      })
      
      await Promise.all(promises)
      
      // Small delay to avoid overwhelming S3
      if (i + batchSize < imageFiles.length) {
        await new Promise(resolve => setTimeout(resolve, 100))
      }
    }

    // Save URL mappings for reference
    fs.writeFileSync(
      path.join(__dirname, 'image-url-mappings.json'),
      JSON.stringify(urlMappings, null, 2)
    )

    console.log('\n📊 Migration Summary:')
    console.log(`✅ Successfully uploaded: ${this.uploadedCount} files`)
    console.log(`❌ Failed uploads: ${this.failedCount} files`)
    console.log(`💾 URL mappings saved to: scripts/image-url-mappings.json`)
    
    if (this.uploadedCount > 0) {
      console.log('\n🎉 Migration completed! Next steps:')
      console.log('1. Update your API to serve images from S3 URLs')
      console.log('2. Test the application with S3 images')
      console.log('3. Remove local images/ folder from git')
      console.log('4. Update .gitignore to exclude images/ folder')
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

// Environment variable template
if (!process.env.AWS_ACCESS_KEY_ID) {
  console.log('⚠️  AWS credentials not found. Please set these environment variables:')
  console.log('   AWS_ACCESS_KEY_ID=your_access_key')
  console.log('   AWS_SECRET_ACCESS_KEY=your_secret_key') 
  console.log('   AWS_S3_BUCKET=your-bucket-name')
  console.log('   AWS_REGION=us-east-1 (optional)')
  console.log('   AWS_CLOUDFRONT_DOMAIN=your-cdn-domain (optional)')
  process.exit(1)
}

const migrator = new S3ImageMigrator()
migrator.run()
