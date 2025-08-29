#!/usr/bin/env ts-node

/**
 * Enhanced TypeScript Delete All Blobs Script for Vercel Blob Storage
 * 
 * This script provides robust blob deletion with rate limiting, exponential backoff,
 * and comprehensive error handling. Use with extreme caution as this action is irreversible!
 * 
 * Features:
 * - Batch processing with configurable batch sizes
 * - Rate limiting and exponential backoff for API limits
 * - Comprehensive error handling and retry logic
 * - Dry-run mode for safe testing
 * - Progress tracking and detailed reporting
 * 
 * Usage:
 *   npx ts-node scripts/delete-all-blobs.ts [--dry-run] [--confirm]
 *   pnpm run delete-blobs [--dry-run] [--confirm]
 * 
 * Options:
 *   --dry-run    Show what would be deleted without actually deleting
 *   --confirm    Skip confirmation prompt (use for automation)
 */

import { list, del, BlobServiceRateLimited } from '@vercel/blob'
import { createInterface } from 'readline'
import { setTimeout } from 'node:timers/promises'

interface BlobInfo {
  url: string
  pathname: string
  size: number
  uploadedAt: Date
}

interface DeletionResults {
  successful: number
  failed: number
  errors: Array<{ url: string; error: string }>
  totalProcessed: number
}

class EnhancedBlobCleaner {
  private token: string
  private dryRun: boolean
  private skipConfirmation: boolean
  // Conservative batch size and delays for rate limiting
  private readonly BATCH_SIZE = 100
  private readonly DELAY_MS = 1000 // 1 second delay between batches
  private readonly MAX_RETRIES = 3

  constructor() {
    this.token = process.env.BLOB_READ_WRITE_TOKEN || ''
    this.dryRun = process.argv.includes('--dry-run')
    this.skipConfirmation = process.argv.includes('--confirm')
    
    if (!this.token) {
      console.error('❌ Error: BLOB_READ_WRITE_TOKEN environment variable is required')
      console.error('💡 Make sure to set your BLOB_READ_WRITE_TOKEN environment variable')
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

  private async listAllBlobsWithCursor(): Promise<BlobInfo[]> {
    console.log('📋 Fetching complete list of all blobs...')
    
    let cursor: string | undefined
    let allBlobs: BlobInfo[] = []
    let totalFetched = 0

    try {
      do {
        const listResult: { blobs: BlobInfo[]; cursor?: string } = await list({
          cursor,
          limit: this.BATCH_SIZE,
          token: this.token,
        })

        allBlobs.push(...listResult.blobs)
        totalFetched += listResult.blobs.length
        cursor = listResult.cursor

        if (listResult.blobs.length > 0) {
          console.log(`📊 Fetched ${listResult.blobs.length} blobs (${totalFetched} total so far)`)
        }
      } while (cursor)

      console.log(`📊 Found ${allBlobs.length} total blobs in storage`)
      return allBlobs
    } catch (error) {
      console.error('❌ Error fetching blob list:', (error as Error).message)
      throw error
    }
  }

  private async deleteBlobsBatchWithRetry(urls: string[]): Promise<DeletionResults> {
    const results: DeletionResults = {
      successful: 0,
      failed: 0,
      errors: [],
      totalProcessed: urls.length
    }

    console.log(`🗑️  ${this.dryRun ? '[DRY RUN] Would delete' : 'Deleting'} batch of ${urls.length} blobs...`)

    if (this.dryRun) {
      // In dry run mode, just simulate success
      results.successful = urls.length
      urls.forEach(url => {
        console.log(`✅ [DRY RUN] Would delete: ${url}`)
      })
      return results
    }

    // Retry logic with exponential backoff
    let retries = 0
    
    while (retries <= this.MAX_RETRIES) {
      try {
        await del(urls, { token: this.token })
        results.successful = urls.length
        console.log(`✅ Successfully deleted batch of ${urls.length} blobs`)
        break // Success, exit retry loop
      } catch (error) {
        retries++

        if (retries > this.MAX_RETRIES) {
          console.error(`❌ Failed to delete batch after ${this.MAX_RETRIES} retries:`, (error as Error).message)
          results.failed = urls.length
          results.errors.push({ url: `batch-${urls.length}-items`, error: (error as Error).message })
          break
        }

        // Calculate backoff delay
        let backoffDelay = 2 ** retries * 1000 // Exponential backoff

        // Handle rate limiting specifically
        if (error instanceof BlobServiceRateLimited) {
          backoffDelay = error.retryAfter * 1000
          console.warn(`🚦 Rate limited. Retrying after ${error.retryAfter}s (attempt ${retries}/${this.MAX_RETRIES})`)
        } else {
          console.warn(`⚠️  Retry ${retries}/${this.MAX_RETRIES} after ${backoffDelay}ms delay`)
        }

        await setTimeout(backoffDelay)
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



  async deleteAllBlobs(): Promise<void> {
    let cursor: string | undefined
    let totalDeleted = 0
    let totalFailed = 0
    let allErrors: Array<{ url: string; error: string }> = []

    try {
      console.log('🚀 Starting enhanced blob deletion process...')
      
      // First, get a count of total blobs for progress tracking
      const allBlobs = await this.listAllBlobsWithCursor()
      
      if (allBlobs.length === 0) {
        console.log('✅ No blobs found to delete')
        return
      }

      // Show summary information
      const totalSize = allBlobs.reduce((sum, blob) => sum + blob.size, 0)
      console.log(`\n📊 Found ${allBlobs.length} blobs, total size: ${this.formatBytes(totalSize)}`)

      if (this.dryRun) {
        console.log('\n🔍 DRY RUN MODE: No blobs will be actually deleted')
        // Show first few blobs as preview
        console.log('\n📝 Preview of blobs that would be deleted:')
        allBlobs.slice(0, 5).forEach((blob, index) => {
          console.log(`  ${index + 1}. ${blob.pathname} (${this.formatBytes(blob.size)})`)
        })
        if (allBlobs.length > 5) {
          console.log(`  ... and ${allBlobs.length - 5} more blobs`)
        }
      } else {
        // Confirm deletion
        const confirmed = await this.confirmDeletion()
        if (!confirmed) {
          console.log('❌ Deletion cancelled by user')
          return
        }
      }

      // Process blobs in batches using cursor-based pagination
      cursor = undefined
      let batchNumber = 0

      do {
        const listResult: { blobs: BlobInfo[]; cursor?: string } = await list({
          cursor,
          limit: this.BATCH_SIZE,
          token: this.token,
        })

        if (listResult.blobs.length > 0) {
          batchNumber++
          const estimatedTotalBatches = Math.ceil(allBlobs.length / this.BATCH_SIZE)
          const batchUrls = listResult.blobs.map((blob: BlobInfo) => blob.url)

          console.log(`\n🔄 Processing batch ${batchNumber}/${estimatedTotalBatches} (${listResult.blobs.length} blobs)`)
          
          const results = await this.deleteBlobsBatchWithRetry(batchUrls)
          
          totalDeleted += results.successful
          totalFailed += results.failed
          allErrors.push(...results.errors)

          console.log(`📊 Progress: ${totalDeleted + totalFailed}/${allBlobs.length} processed (${totalDeleted} successful, ${totalFailed} failed)`)

          // Add delay between batches to respect rate limits
          if (listResult.cursor) {
            console.log(`⏳ Waiting ${this.DELAY_MS}ms before next batch...`)
            await setTimeout(this.DELAY_MS)
          }
        }

        cursor = listResult.cursor
      } while (cursor)

      // Final summary
      console.log('\n🎉 DELETION COMPLETE!')
      console.log('📊 FINAL SUMMARY:')
      console.log(`✅ Successfully ${this.dryRun ? 'would delete' : 'deleted'}: ${totalDeleted} blobs`)
      console.log(`❌ Failed: ${totalFailed} blobs`)
      
      if (allErrors.length > 0) {
        console.log('\n❌ Errors encountered:')
        allErrors.forEach(({ url, error }) => {
          console.log(`  - ${url}: ${error}`)
        })
      }

      if (!this.dryRun && totalDeleted > 0) {
        console.log(`\n✅ Successfully deleted ${totalDeleted} blobs from Vercel blob storage`)
        if (totalFailed === 0) {
          console.log('💡 All blobs were deleted successfully. The blob store should now be empty.')
        }
      }

    } catch (error) {
      console.error('💥 Fatal error during blob deletion:', (error as Error).message)
      console.error('📊 Progress before error: deleted', totalDeleted, 'failed', totalFailed)
      process.exit(1)
    }
  }

  async run(): Promise<void> {
    console.log('🚀 Enhanced Vercel Blob Storage Cleanup Tool')
    console.log('============================================\n')

    if (this.dryRun) {
      console.log('🔍 Running in DRY RUN mode - no actual deletions will occur\n')
    }

    console.log('⚙️  Configuration:')
    console.log(`   • Batch size: ${this.BATCH_SIZE} blobs`)
    console.log(`   • Delay between batches: ${this.DELAY_MS}ms`)
    console.log(`   • Max retries per batch: ${this.MAX_RETRIES}`)
    console.log(`   • Rate limiting: Enabled with exponential backoff\n`)

    await this.deleteAllBlobs()
  }
}

// Run the script
if (import.meta.url === `file://${process.argv[1]}`) {
  const cleaner = new EnhancedBlobCleaner()
  cleaner.run().catch((error) => {
    console.error('💥 Script failed:', error)
    process.exit(1)
  })
}
