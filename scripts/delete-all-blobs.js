#!/usr/bin/env node

/**
 * Delete All Blobs Script for Vercel Blob Storage
 * 
 * This script will delete ALL blobs from your Vercel blob store.
 * Use with extreme caution as this action is irreversible!
 * 
 * Usage:
 *   node scripts/delete-all-blobs.js [--dry-run] [--confirm]
 * 
 * Options:
 *   --dry-run    Show what would be deleted without actually deleting
 *   --confirm    Skip confirmation prompt (use for automation)
 */

const { list, del } = require('@vercel/blob')
const readline = require('readline')

// Configuration
const BATCH_SIZE = 50 // Number of blobs to delete in each batch
const DELAY_BETWEEN_BATCHES = 1000 // 1 second delay between batches

class BlobCleaner {
  constructor() {
    this.token = process.env.BLOB_READ_WRITE_TOKEN
    this.dryRun = process.argv.includes('--dry-run')
    this.skipConfirmation = process.argv.includes('--confirm')
    
    if (!this.token) {
      console.error('❌ Error: BLOB_READ_WRITE_TOKEN environment variable is required')
      process.exit(1)
    }
  }

  async confirmDeletion() {
    if (this.skipConfirmation) {
      return true
    }

    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    })

    return new Promise((resolve) => {
      rl.question(
        '⚠️  This will DELETE ALL BLOBS from your Vercel blob store. This action is IRREVERSIBLE!\n' +
        'Are you absolutely sure you want to continue? Type "DELETE ALL" to confirm: ',
        (answer) => {
          rl.close()
          resolve(answer === 'DELETE ALL')
        }
      )
    })
  }

  async listAllBlobs() {
    console.log('📋 Fetching list of all blobs...')
    
    try {
      const { blobs } = await list({
        token: this.token,
        limit: 1000 // Get up to 1000 blobs at once
      })

      console.log(`📊 Found ${blobs.length} blobs in storage`)
      return blobs
    } catch (error) {
      console.error('❌ Error fetching blob list:', error.message)
      throw error
    }
  }

  async deleteBlobsBatch(urls) {
    const results = {
      successful: 0,
      failed: 0,
      errors: []
    }

    console.log(`🗑️  Deleting batch of ${urls.length} blobs...`)

    for (const url of urls) {
      try {
        if (!this.dryRun) {
          await del(url, { token: this.token })
        }
        results.successful++
        console.log(`✅ ${this.dryRun ? '[DRY RUN] Would delete' : 'Deleted'}: ${url}`)
      } catch (error) {
        results.failed++
        results.errors.push({ url, error: error.message })
        console.error(`❌ Failed to delete ${url}: ${error.message}`)
      }
    }

    return results
  }

  async deleteAllBlobs() {
    try {
      // List all blobs
      const blobs = await this.listAllBlobs()
      
      if (blobs.length === 0) {
        console.log('✅ No blobs found to delete')
        return
      }

      // Show blob information
      console.log('\n📝 Blob details:')
      blobs.forEach((blob, index) => {
        const sizeKB = (blob.size / 1024).toFixed(2)
        console.log(`  ${index + 1}. ${blob.pathname} (${sizeKB} KB, uploaded: ${new Date(blob.uploadedAt).toLocaleString()})`)
      })

      // Calculate total size
      const totalSize = blobs.reduce((sum, blob) => sum + blob.size, 0)
      const totalSizeMB = (totalSize / 1024 / 1024).toFixed(2)
      console.log(`\n📊 Total size: ${totalSizeMB} MB`)

      if (this.dryRun) {
        console.log('\n🔍 DRY RUN MODE: No blobs will be actually deleted')
      } else {
        // Confirm deletion
        const confirmed = await this.confirmDeletion()
        if (!confirmed) {
          console.log('❌ Deletion cancelled by user')
          return
        }
      }

      // Delete blobs in batches
      const urls = blobs.map(blob => blob.url)
      const totalResults = {
        successful: 0,
        failed: 0,
        errors: []
      }

      for (let i = 0; i < urls.length; i += BATCH_SIZE) {
        const batch = urls.slice(i, i + BATCH_SIZE)
        const batchNumber = Math.floor(i / BATCH_SIZE) + 1
        const totalBatches = Math.ceil(urls.length / BATCH_SIZE)
        
        console.log(`\n🔄 Processing batch ${batchNumber}/${totalBatches}`)
        
        const results = await this.deleteBlobsBatch(batch)
        
        totalResults.successful += results.successful
        totalResults.failed += results.failed
        totalResults.errors.push(...results.errors)

        // Delay between batches to avoid rate limiting
        if (i + BATCH_SIZE < urls.length) {
          console.log(`⏳ Waiting ${DELAY_BETWEEN_BATCHES}ms before next batch...`)
          await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_BATCHES))
        }
      }

      // Summary
      console.log('\n📊 DELETION SUMMARY:')
      console.log(`✅ Successfully ${this.dryRun ? 'would delete' : 'deleted'}: ${totalResults.successful} blobs`)
      console.log(`❌ Failed: ${totalResults.failed} blobs`)
      
      if (totalResults.errors.length > 0) {
        console.log('\n❌ Errors:')
        totalResults.errors.forEach(({ url, error }) => {
          console.log(`  - ${url}: ${error}`)
        })
      }

      if (!this.dryRun && totalResults.successful > 0) {
        console.log(`\n✅ Successfully deleted ${totalResults.successful} blobs from Vercel blob storage`)
        console.log('💡 The blob store should now be empty and can be deleted from the Vercel dashboard')
      }

    } catch (error) {
      console.error('💥 Fatal error:', error.message)
      process.exit(1)
    }
  }

  async run() {
    console.log('🚀 Vercel Blob Storage Cleanup Tool')
    console.log('=====================================\n')

    if (this.dryRun) {
      console.log('🔍 Running in DRY RUN mode - no actual deletions will occur\n')
    }

    await this.deleteAllBlobs()
  }
}

// Run the script
if (require.main === module) {
  const cleaner = new BlobCleaner()
  cleaner.run().catch(console.error)
}

module.exports = BlobCleaner
