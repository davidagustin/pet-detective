#!/usr/bin/env ts-node

/**
 * TypeScript Delete All Blobs Script for Vercel Blob Storage
 * 
 * This script uses the existing BlobStorageManager to delete all blobs.
 * Use with extreme caution as this action is irreversible!
 * 
 * Usage:
 *   npx ts-node scripts/delete-all-blobs.ts [--dry-run] [--confirm]
 * 
 * Options:
 *   --dry-run    Show what would be deleted without actually deleting
 *   --confirm    Skip confirmation prompt (use for automation)
 */

import { list, del } from '@vercel/blob'
import { createInterface } from 'readline'
import { blobStorage } from '../lib/blob-storage'

interface BlobInfo {
  url: string
  pathname: string
  size: number
  uploadedAt: string
}

interface DeletionResults {
  successful: number
  failed: number
  errors: Array<{ url: string; error: string }>
}

class TypeScriptBlobCleaner {
  private token: string
  private dryRun: boolean
  private skipConfirmation: boolean
  private readonly BATCH_SIZE = 50
  private readonly DELAY_BETWEEN_BATCHES = 1000

  constructor() {
    this.token = process.env.BLOB_READ_WRITE_TOKEN || ''
    this.dryRun = process.argv.includes('--dry-run')
    this.skipConfirmation = process.argv.includes('--confirm')
    
    if (!this.token) {
      console.error('❌ Error: BLOB_READ_WRITE_TOKEN environment variable is required')
      process.exit(1)
    }
  }

  private async confirmDeletion(): Promise<boolean> {
    if (this.skipConfirmation) {
      return true
    }

    const rl = createInterface({
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

  private async listAllBlobs(): Promise<BlobInfo[]> {
    console.log('📋 Fetching list of all blobs...')
    
    try {
      const { blobs } = await list({
        token: this.token,
        limit: 1000
      })

      console.log(`📊 Found ${blobs.length} blobs in storage`)
      return blobs
    } catch (error) {
      console.error('❌ Error fetching blob list:', (error as Error).message)
      throw error
    }
  }

  private async deleteBlobsBatch(urls: string[]): Promise<DeletionResults> {
    const results: DeletionResults = {
      successful: 0,
      failed: 0,
      errors: []
    }

    console.log(`🗑️  ${this.dryRun ? '[DRY RUN] Would delete' : 'Deleting'} batch of ${urls.length} blobs...`)

    for (const url of urls) {
      try {
        if (!this.dryRun) {
          await del(url, { token: this.token })
        }
        results.successful++
        console.log(`✅ ${this.dryRun ? '[DRY RUN] Would delete' : 'Deleted'}: ${url}`)
      } catch (error) {
        results.failed++
        results.errors.push({ url, error: (error as Error).message })
        console.error(`❌ Failed to delete ${url}: ${(error as Error).message}`)
      }
    }

    return results
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  async deleteAllBlobs(): Promise<void> {
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
        console.log(`  ${index + 1}. ${blob.pathname} (${this.formatBytes(blob.size)}, uploaded: ${new Date(blob.uploadedAt).toLocaleString()})`)
      })

      // Calculate total size
      const totalSize = blobs.reduce((sum, blob) => sum + blob.size, 0)
      console.log(`\n📊 Total size: ${this.formatBytes(totalSize)}`)

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
      const totalResults: DeletionResults = {
        successful: 0,
        failed: 0,
        errors: []
      }

      for (let i = 0; i < urls.length; i += this.BATCH_SIZE) {
        const batch = urls.slice(i, i + this.BATCH_SIZE)
        const batchNumber = Math.floor(i / this.BATCH_SIZE) + 1
        const totalBatches = Math.ceil(urls.length / this.BATCH_SIZE)
        
        console.log(`\n🔄 Processing batch ${batchNumber}/${totalBatches}`)
        
        const results = await this.deleteBlobsBatch(batch)
        
        totalResults.successful += results.successful
        totalResults.failed += results.failed
        totalResults.errors.push(...results.errors)

        // Delay between batches to avoid rate limiting
        if (i + this.BATCH_SIZE < urls.length) {
          console.log(`⏳ Waiting ${this.DELAY_BETWEEN_BATCHES}ms before next batch...`)
          await this.delay(this.DELAY_BETWEEN_BATCHES)
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
      console.error('💥 Fatal error:', (error as Error).message)
      process.exit(1)
    }
  }

  async run(): Promise<void> {
    console.log('🚀 Vercel Blob Storage Cleanup Tool (TypeScript)')
    console.log('===============================================\n')

    if (this.dryRun) {
      console.log('🔍 Running in DRY RUN mode - no actual deletions will occur\n')
    }

    await this.deleteAllBlobs()
  }
}

// Run the script
if (require.main === module) {
  const cleaner = new TypeScriptBlobCleaner()
  cleaner.run().catch(console.error)
}
