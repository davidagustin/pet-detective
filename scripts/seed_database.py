#!/usr/bin/env python3
"""
Script to seed the database with pet images and their metadata.
This script uploads images to Vercel Blob storage and inserts records into Supabase.
"""

import os
import sys
import asyncio
from pathlib import Path
from typing import Dict, List, Tuple
import logging
from supabase import create_client, Client
import requests
from PIL import Image
import hashlib

# Add the parent directory to sys.path to import our modules
sys.path.append(str(Path(__file__).parent.parent))

from lib.blob_storage import blobStorage

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class DatabaseSeeder:
    def __init__(self):
        """Initialize Supabase client and blob storage"""
        # Load environment variables
        from dotenv import load_dotenv
        load_dotenv()
        
        supabase_url = os.getenv('NEXT_PUBLIC_SUPABASE_URL')
        supabase_service_key = os.getenv('SUPABASE_SERVICE_ROLE_KEY')
        
        if not supabase_url or not supabase_service_key:
            raise ValueError("Missing Supabase configuration. Please check your environment variables.")
        
        self.supabase: Client = create_client(supabase_url, supabase_service_key)
        self.images_processed = 0
        self.images_skipped = 0
        
        # Breed mapping for animal types
        self.cat_breeds = {
            'Abyssinian', 'Bengal', 'Birman', 'Bombay', 'British', 'Egyptian', 
            'Maine', 'Persian', 'Ragdoll', 'Russian', 'Siamese', 'Sphynx'
        }
    
    def parse_filename(self, filename: str) -> Tuple[str, str]:
        """Parse filename to extract breed and animal type"""
        # Remove extension
        name_without_ext = os.path.splitext(filename)[0]
        parts = name_without_ext.split('_')
        
        if len(parts) < 2:
            return None, None
        
        # Handle breeds with underscores
        if parts[0] in ['British', 'Egyptian', 'Maine', 'Russian']:
            breed = f"{parts[0]} {parts[1].title()}"  # British_Shorthair -> British Shorthair
        elif parts[0] in ['American', 'German', 'Yorkshire', 'English', 'Great', 'Staffordshire']:
            breed = f"{parts[0]} {parts[1].title()}"  # German_Shorthaired -> German Shorthaired
        else:
            breed = parts[0].title()
        
        # Determine animal type
        breed_key = parts[0]
        if breed_key in self.cat_breeds:
            animal_type = 'cat'
        else:
            animal_type = 'dog'
        
        return breed, animal_type
    
    def get_image_info(self, image_path: str) -> Dict:
        """Get image dimensions and file size"""
        try:
            with Image.open(image_path) as img:
                width, height = img.size
            
            file_size = os.path.getsize(image_path)
            return {
                'width': width,
                'height': height,
                'file_size': file_size
            }
        except Exception as e:
            logger.warning(f"Could not get image info for {image_path}: {e}")
            return {'width': None, 'height': None, 'file_size': None}
    
    async def upload_and_record_image(self, image_path: str, filename: str) -> bool:
        """Upload image to blob storage and record in database"""
        try:
            # Parse breed and animal type from filename
            breed, animal_type = self.parse_filename(filename)
            if not breed or not animal_type:
                logger.warning(f"Could not parse breed from filename: {filename}")
                return False
            
            # Check if image already exists in database
            existing = self.supabase.table('pet_images').select('id').eq('filename', filename).execute()
            if existing.data:
                logger.info(f"Image {filename} already exists in database, skipping...")
                self.images_skipped += 1
                return True
            
            # Get image information
            image_info = self.get_image_info(image_path)
            
            # Upload to blob storage
            logger.info(f"Uploading {filename} to blob storage...")
            with open(image_path, 'rb') as f:
                blob_url = await blobStorage.uploadImage({
                    'filename': filename,
                    'file': f.read(),
                    'breed': breed,
                    'animalType': animal_type
                })
            
            # Insert record into database
            logger.info(f"Recording {filename} in database...")
            result = self.supabase.table('pet_images').insert({
                'filename': filename,
                'breed': breed,
                'animal_type': animal_type,
                'blob_url': blob_url,
                'file_size': image_info['file_size'],
                'width': image_info['width'],
                'height': image_info['height'],
                'is_active': True
            }).execute()
            
            if result.data:
                logger.info(f"Successfully processed {filename}")
                self.images_processed += 1
                return True
            else:
                logger.error(f"Failed to insert {filename} into database")
                return False
                
        except Exception as e:
            logger.error(f"Error processing {filename}: {e}")
            return False
    
    async def seed_from_directory(self, images_dir: str, limit: int = None):
        """Seed database with images from a directory"""
        images_dir = Path(images_dir)
        if not images_dir.exists():
            logger.error(f"Images directory does not exist: {images_dir}")
            return
        
        # Get all image files
        image_extensions = {'.jpg', '.jpeg', '.png', '.gif'}
        image_files = [
            f for f in images_dir.iterdir() 
            if f.is_file() and f.suffix.lower() in image_extensions
        ]
        
        if limit:
            image_files = image_files[:limit]
        
        logger.info(f"Found {len(image_files)} images to process...")
        
        # Process images in batches to avoid overwhelming the API
        batch_size = 10
        for i in range(0, len(image_files), batch_size):
            batch = image_files[i:i + batch_size]
            logger.info(f"Processing batch {i//batch_size + 1}/{(len(image_files) + batch_size - 1)//batch_size}")
            
            tasks = []
            for image_file in batch:
                task = self.upload_and_record_image(str(image_file), image_file.name)
                tasks.append(task)
            
            # Process batch concurrently
            await asyncio.gather(*tasks)
            
            # Small delay between batches
            await asyncio.sleep(1)
        
        logger.info(f"Seeding complete! Processed: {self.images_processed}, Skipped: {self.images_skipped}")
    
    def create_sample_data(self):
        """Create sample data for testing without requiring actual image uploads"""
        sample_images = [
            {
                'filename': 'german_shorthaired_1.jpg',
                'breed': 'German Shorthaired Pointer',
                'animal_type': 'dog',
                'blob_url': 'https://nazlecf04j1fmxmj.public.blob.vercel-storage.com/german_shorthaired_1.jpg'
            },
            {
                'filename': 'beagle_1.jpg',
                'breed': 'Beagle',
                'animal_type': 'dog',
                'blob_url': 'https://nazlecf04j1fmxmj.public.blob.vercel-storage.com/beagle_1.jpg'
            },
            {
                'filename': 'siamese_1.jpg',
                'breed': 'Siamese',
                'animal_type': 'cat',
                'blob_url': 'https://nazlecf04j1fmxmj.public.blob.vercel-storage.com/siamese_1.jpg'
            },
            {
                'filename': 'pug_1.jpg',
                'breed': 'Pug',
                'animal_type': 'dog',
                'blob_url': 'https://nazlecf04j1fmxmj.public.blob.vercel-storage.com/pug_1.jpg'
            },
            {
                'filename': 'maine_coon_1.jpg',
                'breed': 'Maine Coon',
                'animal_type': 'cat',
                'blob_url': 'https://nazlecf04j1fmxmj.public.blob.vercel-storage.com/maine_coon_1.jpg'
            }
        ]
        
        logger.info("Creating sample data...")
        for image_data in sample_images:
            try:
                result = self.supabase.table('pet_images').upsert(image_data).execute()
                if result.data:
                    logger.info(f"Inserted sample data for {image_data['filename']}")
                else:
                    logger.warning(f"Failed to insert {image_data['filename']}")
            except Exception as e:
                logger.error(f"Error inserting {image_data['filename']}: {e}")

async def main():
    """Main function to run the seeder"""
    import argparse
    
    parser = argparse.ArgumentParser(description='Seed database with pet images')
    parser.add_argument('--images-dir', default='../images', help='Directory containing images')
    parser.add_argument('--limit', type=int, help='Limit number of images to process')
    parser.add_argument('--sample-only', action='store_true', help='Only create sample data')
    
    args = parser.parse_args()
    
    seeder = DatabaseSeeder()
    
    if args.sample_only:
        seeder.create_sample_data()
    else:
        await seeder.seed_from_directory(args.images_dir, args.limit)

if __name__ == '__main__':
    asyncio.run(main())
