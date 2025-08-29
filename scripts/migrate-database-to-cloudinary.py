#!/usr/bin/env python3
"""
Database Migration Script - Update pet_images table to use Cloudinary URLs

This script updates existing database records to use Cloudinary URLs instead of local file paths.
It's designed to be run after the Cloudinary image migration is complete.

Usage:
    python scripts/migrate-database-to-cloudinary.py [--dry-run] [--batch-size 100]

Options:
    --dry-run       Show what would be updated without making changes
    --batch-size    Number of records to process in each batch (default: 100)
"""

import os
import sys
import json
import argparse
from typing import Dict, List, Any
from supabase import create_client, Client
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

class DatabaseMigrator:
    def __init__(self, dry_run: bool = False, batch_size: int = 100):
        """Initialize the database migrator"""
        self.dry_run = dry_run
        self.batch_size = batch_size
        
        # Initialize Supabase client
        supabase_url = os.getenv('NEXT_PUBLIC_SUPABASE_URL')
        supabase_service_key = os.getenv('SUPABASE_SERVICE_ROLE_KEY')
        
        if not supabase_url or not supabase_service_key:
            raise ValueError("Missing Supabase configuration. Please check your environment variables.")
        
        self.supabase: Client = create_client(supabase_url, supabase_service_key)
        
        # Load Cloudinary mappings
        self.cloudinary_mappings = self._load_cloudinary_mappings()
        
        print(f"🚀 Database Migrator initialized {'[DRY RUN]' if dry_run else ''}")
        print(f"📊 Loaded {len(self.cloudinary_mappings)} Cloudinary URL mappings")
    
    def _load_cloudinary_mappings(self) -> Dict[str, Any]:
        """Load the Cloudinary mappings from JSON file"""
        try:
            mappings_path = os.path.join(
                os.path.dirname(__file__), 
                'cloudinary-mappings.json'
            )
            with open(mappings_path, 'r') as f:
                return json.load(f)
        except FileNotFoundError:
            print("❌ Error: cloudinary-mappings.json not found. Please run the image migration first.")
            sys.exit(1)
    
    def get_cloudinary_url(self, filename: str) -> str:
        """Get Cloudinary URL for a filename"""
        if filename in self.cloudinary_mappings:
            return self.cloudinary_mappings[filename]['secureUrl']
        else:
            # Construct URL if not in mappings
            breed, number = self._parse_filename(filename)
            return f"https://res.cloudinary.com/drj3twq19/image/upload/pet-detective/pet-detective/{breed}_{number}.jpg"
    
    def _parse_filename(self, filename: str) -> tuple:
        """Parse breed and number from filename like 'Abyssinian_1.jpg'"""
        name_without_ext = filename.replace('.jpg', '').replace('.jpeg', '').replace('.png', '')
        parts = name_without_ext.split('_')
        
        if len(parts) < 2:
            return filename, '1'
        
        number = parts[-1]
        breed = '_'.join(parts[:-1])
        return breed, number
    
    def migrate_pet_images_table(self):
        """Migrate the pet_images table to use Cloudinary URLs"""
        print("\n🔄 Starting pet_images table migration...")
        
        try:
            # First, check if the table exists
            response = self.supabase.table('pet_images').select('id', count='exact').limit(1).execute()
            total_records = response.count if response.count else 0
            
            if total_records == 0:
                print("ℹ️  No records found in pet_images table. Skipping migration.")
                return
            
            print(f"📊 Found {total_records} records to migrate")
            
            # Process records in batches
            offset = 0
            updated_count = 0
            error_count = 0
            
            while offset < total_records:
                # Fetch batch of records
                response = self.supabase.table('pet_images')\
                    .select('id', 'filename', 'blob_url')\
                    .range(offset, offset + self.batch_size - 1)\
                    .execute()
                
                if not response.data:
                    break
                
                batch_updates = []
                
                for record in response.data:
                    try:
                        filename = record['filename']
                        current_url = record['blob_url']
                        
                        # Skip if already using Cloudinary
                        if 'cloudinary.com' in current_url:
                            continue
                        
                        # Get new Cloudinary URL
                        new_url = self.get_cloudinary_url(filename)
                        
                        batch_updates.append({
                            'id': record['id'],
                            'blob_url': new_url
                        })
                        
                        print(f"📝 {filename}: {current_url} -> {new_url}")
                        
                    except Exception as e:
                        print(f"❌ Error processing record {record['id']}: {e}")
                        error_count += 1
                
                # Perform batch update
                if batch_updates and not self.dry_run:
                    try:
                        for update in batch_updates:
                            self.supabase.table('pet_images')\
                                .update({'blob_url': update['blob_url']})\
                                .eq('id', update['id'])\
                                .execute()
                        
                        updated_count += len(batch_updates)
                        print(f"✅ Updated {len(batch_updates)} records in batch")
                        
                    except Exception as e:
                        print(f"❌ Error updating batch: {e}")
                        error_count += len(batch_updates)
                
                elif batch_updates and self.dry_run:
                    print(f"🔍 [DRY RUN] Would update {len(batch_updates)} records in this batch")
                    updated_count += len(batch_updates)
                
                offset += self.batch_size
                
                # Progress update
                progress = min(offset, total_records)
                print(f"📈 Progress: {progress}/{total_records} ({(progress/total_records)*100:.1f}%)")
            
            print(f"\n🎉 Migration completed!")
            print(f"✅ Records updated: {updated_count}")
            print(f"❌ Errors: {error_count}")
            
            if self.dry_run:
                print("\n💡 This was a dry run. Use --no-dry-run to apply changes.")
            
        except Exception as e:
            print(f"💥 Migration failed: {e}")
            sys.exit(1)
    
    def create_cloudinary_indexes(self):
        """Create database indexes for better performance with Cloudinary URLs"""
        print("\n🔄 Creating database indexes for Cloudinary optimization...")
        
        indexes = [
            {
                'name': 'idx_pet_images_breed',
                'table': 'pet_images',
                'columns': ['breed'],
                'sql': 'CREATE INDEX IF NOT EXISTS idx_pet_images_breed ON pet_images(breed);'
            },
            {
                'name': 'idx_pet_images_animal_type',
                'table': 'pet_images',
                'columns': ['animal_type'],
                'sql': 'CREATE INDEX IF NOT EXISTS idx_pet_images_animal_type ON pet_images(animal_type);'
            },
            {
                'name': 'idx_pet_images_breed_animal_type',
                'table': 'pet_images',
                'columns': ['breed', 'animal_type'],
                'sql': 'CREATE INDEX IF NOT EXISTS idx_pet_images_breed_animal_type ON pet_images(breed, animal_type);'
            }
        ]
        
        for index in indexes:
            try:
                if not self.dry_run:
                    # Note: Supabase doesn't directly support raw SQL execution via the client
                    # This would need to be run manually in the Supabase SQL editor
                    print(f"📝 Index SQL for {index['name']}: {index['sql']}")
                else:
                    print(f"🔍 [DRY RUN] Would create index: {index['name']}")
                    
            except Exception as e:
                print(f"❌ Error creating index {index['name']}: {e}")
        
        print("\n💡 Note: Indexes must be created manually in Supabase SQL editor:")
        for index in indexes:
            print(f"   {index['sql']}")
    
    def verify_migration(self):
        """Verify that the migration was successful"""
        print("\n🔍 Verifying migration...")
        
        try:
            # Check for records still using local URLs
            response = self.supabase.table('pet_images')\
                .select('id', 'filename', 'blob_url')\
                .not_.like('blob_url', '%cloudinary.com%')\
                .limit(10)\
                .execute()
            
            local_urls = response.data or []
            
            if local_urls:
                print(f"⚠️  Found {len(local_urls)} records still using local URLs:")
                for record in local_urls:
                    print(f"   - {record['filename']}: {record['blob_url']}")
            else:
                print("✅ All records are using Cloudinary URLs")
            
            # Check total records with Cloudinary URLs
            response = self.supabase.table('pet_images')\
                .select('id', count='exact')\
                .like('blob_url', '%cloudinary.com%')\
                .execute()
            
            cloudinary_count = response.count if response.count else 0
            
            # Get total records
            response = self.supabase.table('pet_images')\
                .select('id', count='exact')\
                .execute()
            
            total_count = response.count if response.count else 0
            
            print(f"📊 Migration Summary:")
            print(f"   - Total records: {total_count}")
            print(f"   - Using Cloudinary: {cloudinary_count}")
            print(f"   - Migration coverage: {(cloudinary_count/total_count)*100:.1f}%" if total_count > 0 else "   - No records found")
            
        except Exception as e:
            print(f"❌ Verification failed: {e}")
    
    def run_migration(self):
        """Run the complete migration process"""
        print("🚀 Starting Cloudinary database migration...")
        
        # Step 1: Migrate pet_images table
        self.migrate_pet_images_table()
        
        # Step 2: Create indexes (optional)
        self.create_cloudinary_indexes()
        
        # Step 3: Verify migration
        if not self.dry_run:
            self.verify_migration()

def main():
    parser = argparse.ArgumentParser(description='Migrate database to use Cloudinary URLs')
    parser.add_argument('--dry-run', action='store_true', help='Show what would be updated without making changes')
    parser.add_argument('--batch-size', type=int, default=100, help='Number of records to process in each batch')
    
    args = parser.parse_args()
    
    migrator = DatabaseMigrator(dry_run=args.dry_run, batch_size=args.batch_size)
    migrator.run_migration()

if __name__ == '__main__':
    main()
