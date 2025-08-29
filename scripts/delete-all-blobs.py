#!/usr/bin/env python3

"""
Python Delete All Blobs Script for Vercel Blob Storage

This script will delete ALL blobs from your Vercel blob store using HTTP requests.
Use with extreme caution as this action is irreversible!

Usage:
    python scripts/delete-all-blobs.py [--dry-run] [--confirm]

Options:
    --dry-run    Show what would be deleted without actually deleting
    --confirm    Skip confirmation prompt (use for automation)

Requirements:
    pip install requests python-dotenv
"""

import os
import sys
import json
import time
import argparse
import requests
from typing import List, Dict, Any
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

class PythonBlobCleaner:
    def __init__(self, dry_run: bool = False, skip_confirmation: bool = False):
        self.token = os.getenv('BLOB_READ_WRITE_TOKEN')
        self.dry_run = dry_run
        self.skip_confirmation = skip_confirmation
        self.batch_size = 50
        self.delay_between_batches = 1.0  # seconds
        
        if not self.token:
            print('❌ Error: BLOB_READ_WRITE_TOKEN environment variable is required')
            sys.exit(1)
    
    def confirm_deletion(self) -> bool:
        """Ask user to confirm deletion"""
        if self.skip_confirmation:
            return True
        
        print('⚠️  This will DELETE ALL BLOBS from your Vercel blob store. This action is IRREVERSIBLE!')
        response = input('Are you absolutely sure you want to continue? Type "DELETE ALL" to confirm: ')
        return response == 'DELETE ALL'
    
    def list_all_blobs(self) -> List[Dict[str, Any]]:
        """List all blobs in the storage"""
        print('📋 Fetching list of all blobs...')
        
        try:
            headers = {
                'Authorization': f'Bearer {self.token}',
                'Content-Type': 'application/json'
            }
            
            response = requests.get(
                'https://api.vercel.com/v2/blob',
                headers=headers,
                params={'limit': '1000'}
            )
            response.raise_for_status()
            
            data = response.json()
            blobs = data.get('blobs', [])
            
            print(f'📊 Found {len(blobs)} blobs in storage')
            return blobs
            
        except requests.RequestException as e:
            print(f'❌ Error fetching blob list: {e}')
            raise
    
    def delete_blob(self, url: str) -> bool:
        """Delete a single blob"""
        try:
            headers = {
                'Authorization': f'Bearer {self.token}',
                'Content-Type': 'application/json'
            }
            
            # Extract blob key from URL
            blob_key = url.split('/')[-1]
            
            response = requests.delete(
                f'https://api.vercel.com/v2/blob/{blob_key}',
                headers=headers
            )
            response.raise_for_status()
            return True
            
        except requests.RequestException as e:
            print(f'❌ Failed to delete {url}: {e}')
            return False
    
    def delete_blobs_batch(self, urls: List[str]) -> Dict[str, Any]:
        """Delete a batch of blobs"""
        results = {
            'successful': 0,
            'failed': 0,
            'errors': []
        }
        
        action = '[DRY RUN] Would delete' if self.dry_run else 'Deleting'
        print(f'🗑️  {action} batch of {len(urls)} blobs...')
        
        for url in urls:
            if self.dry_run:
                print(f'✅ [DRY RUN] Would delete: {url}')
                results['successful'] += 1
            else:
                if self.delete_blob(url):
                    print(f'✅ Deleted: {url}')
                    results['successful'] += 1
                else:
                    results['failed'] += 1
                    results['errors'].append(url)
        
        return results
    
    def format_bytes(self, bytes_size: int) -> str:
        """Format bytes into human readable format"""
        if bytes_size == 0:
            return '0 B'
        
        sizes = ['B', 'KB', 'MB', 'GB']
        k = 1024
        i = 0
        
        while bytes_size >= k and i < len(sizes) - 1:
            bytes_size /= k
            i += 1
        
        return f'{bytes_size:.2f} {sizes[i]}'
    
    def delete_all_blobs(self):
        """Main function to delete all blobs"""
        try:
            # List all blobs
            blobs = self.list_all_blobs()
            
            if not blobs:
                print('✅ No blobs found to delete')
                return
            
            # Show blob information
            print('\n📝 Blob details:')
            total_size = 0
            
            for i, blob in enumerate(blobs, 1):
                size = blob.get('size', 0)
                total_size += size
                uploaded_at = blob.get('uploadedAt', 'Unknown')
                pathname = blob.get('pathname', blob.get('url', 'Unknown'))
                
                print(f'  {i}. {pathname} ({self.format_bytes(size)}, uploaded: {uploaded_at})')
            
            print(f'\n📊 Total size: {self.format_bytes(total_size)}')
            
            if self.dry_run:
                print('\n🔍 DRY RUN MODE: No blobs will be actually deleted')
            else:
                # Confirm deletion
                if not self.confirm_deletion():
                    print('❌ Deletion cancelled by user')
                    return
            
            # Delete blobs in batches
            urls = [blob.get('url', '') for blob in blobs if blob.get('url')]
            total_results = {
                'successful': 0,
                'failed': 0,
                'errors': []
            }
            
            for i in range(0, len(urls), self.batch_size):
                batch = urls[i:i + self.batch_size]
                batch_number = i // self.batch_size + 1
                total_batches = (len(urls) + self.batch_size - 1) // self.batch_size
                
                print(f'\n🔄 Processing batch {batch_number}/{total_batches}')
                
                results = self.delete_blobs_batch(batch)
                
                total_results['successful'] += results['successful']
                total_results['failed'] += results['failed']
                total_results['errors'].extend(results['errors'])
                
                # Delay between batches
                if i + self.batch_size < len(urls):
                    print(f'⏳ Waiting {self.delay_between_batches}s before next batch...')
                    time.sleep(self.delay_between_batches)
            
            # Summary
            print('\n📊 DELETION SUMMARY:')
            action = 'would delete' if self.dry_run else 'deleted'
            print(f'✅ Successfully {action}: {total_results["successful"]} blobs')
            print(f'❌ Failed: {total_results["failed"]} blobs')
            
            if total_results['errors']:
                print('\n❌ Errors:')
                for url in total_results['errors']:
                    print(f'  - {url}')
            
            if not self.dry_run and total_results['successful'] > 0:
                print(f'\n✅ Successfully deleted {total_results["successful"]} blobs from Vercel blob storage')
                print('💡 The blob store should now be empty and can be deleted from the Vercel dashboard')
        
        except Exception as e:
            print(f'💥 Fatal error: {e}')
            sys.exit(1)
    
    def run(self):
        """Run the cleanup tool"""
        print('🚀 Vercel Blob Storage Cleanup Tool (Python)')
        print('============================================\n')
        
        if self.dry_run:
            print('🔍 Running in DRY RUN mode - no actual deletions will occur\n')
        
        self.delete_all_blobs()

def main():
    parser = argparse.ArgumentParser(description='Delete all blobs from Vercel blob storage')
    parser.add_argument('--dry-run', action='store_true', help='Show what would be deleted without deleting')
    parser.add_argument('--confirm', action='store_true', help='Skip confirmation prompt')
    
    args = parser.parse_args()
    
    cleaner = PythonBlobCleaner(
        dry_run=args.dry_run,
        skip_confirmation=args.confirm
    )
    cleaner.run()

if __name__ == '__main__':
    main()
