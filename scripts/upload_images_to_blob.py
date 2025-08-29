#!/usr/bin/env python3
"""
Upload all images to Vercel Blob storage and populate database
"""
import os
import glob
import requests
import json
import time
import hashlib
from PIL import Image
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables
load_dotenv('.env.local')

# Configuration
BLOB_TOKEN = os.getenv('BLOB_READ_WRITE_TOKEN')
SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_SERVICE_KEY = os.getenv('SUPABASE_SERVICE_ROLE_KEY')
BATCH_SIZE = 25  # Process images in larger batches for efficiency
UPLOAD_DELAY = 0.05  # Small delay between uploads to avoid rate limiting

# Breed mapping to classify cats vs dogs
CAT_BREEDS = {
    'Abyssinian', 'Bengal', 'Birman', 'Bombay', 'British_Shorthair', 
    'Egyptian_Mau', 'Maine_Coon', 'Persian', 'Ragdoll', 'Russian_Blue', 
    'Siamese', 'Sphynx'
}

DOG_BREEDS = {
    'american_bulldog', 'american_pit_bull_terrier', 'basset_hound', 'beagle', 
    'boxer', 'chihuahua', 'english_cocker_spaniel', 'english_setter', 
    'german_shorthaired', 'great_pyrenees', 'havanese', 'japanese_chin', 
    'keeshond', 'leonberger', 'miniature_pinscher', 'newfoundland', 
    'pomeranian', 'pug', 'saint_bernard', 'samoyed', 'scottish_terrier', 
    'shiba_inu', 'staffordshire_bull_terrier', 'wheaten_terrier', 'yorkshire_terrier'
}

def get_breed_info(filename):
    """Extract breed and animal type from filename"""
    # Remove .jpg extension and extract breed name
    base_name = Path(filename).stem
    parts = base_name.split('_')
    
    # Handle multi-word breed names
    breed_parts = []
    for part in parts:
        if part.isdigit():
            break
        breed_parts.append(part)
    
    breed = '_'.join(breed_parts)
    
    # Determine animal type
    if breed in CAT_BREEDS:
        animal_type = 'cat'
        # Convert to proper case for cats
        breed_display = breed.replace('_', ' ').title()
    elif breed in DOG_BREEDS:
        animal_type = 'dog'
        # Convert to proper case for dogs
        breed_display = breed.replace('_', ' ').title()
    else:
        print(f"Warning: Unknown breed '{breed}' for file {filename}")
        animal_type = 'unknown'
        breed_display = breed.replace('_', ' ').title()
    
    return breed_display, animal_type

def get_image_dimensions(image_path):
    """Get image dimensions"""
    try:
        with Image.open(image_path) as img:
            return img.size  # Returns (width, height)
    except Exception as e:
        print(f"Error getting dimensions for {image_path}: {e}")
        return None, None

def upload_to_blob(image_path, filename):
    """Upload image to Vercel Blob storage"""
    if not BLOB_TOKEN:
        raise ValueError("BLOB_READ_WRITE_TOKEN not found in environment")
    
    # Read the image file
    with open(image_path, 'rb') as f:
        image_data = f.read()
    
    # Upload to Vercel Blob
    upload_url = f"https://api.vercel.com/blob/{filename}"
    headers = {
        'Authorization': f'Bearer {BLOB_TOKEN}',
        'Content-Type': 'image/jpeg'
    }
    
    response = requests.put(upload_url, headers=headers, data=image_data)
    
    if response.status_code == 200:
        result = response.json()
        return result.get('url')
    else:
        print(f"Failed to upload {filename}: {response.status_code} - {response.text}")
        return None

def insert_to_database(image_records):
    """Insert image records into Supabase database"""
    if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
        print("Supabase credentials not found")
        return False
    
    headers = {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': f'Bearer {SUPABASE_SERVICE_KEY}',
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
    }
    
    # Insert records with conflict resolution
    response = requests.post(
        f'{SUPABASE_URL}/rest/v1/pet_images',
        headers=headers,
        json=image_records
    )
    
    if response.status_code in [201, 409]:  # 201 = created, 409 = conflict (duplicate)
        return True
    else:
        print(f"❌ Failed to insert batch: {response.status_code} - {response.text}")
        return False

def main():
    """Main function to process all images"""
    if not BLOB_TOKEN:
        print("❌ BLOB_READ_WRITE_TOKEN not found in .env.local")
        return
    
    if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
        print("❌ Supabase credentials not found in .env.local")
        return
    
    # Get all image files
    image_files = glob.glob('images/*.jpg')
    total_images = len(image_files)
    
    print(f"🔍 Found {total_images} images to process")
    print(f"📦 Processing in batches of {BATCH_SIZE}")
    
    # Process ALL images - no filtering
    print(f"📝 Processing ALL {len(image_files)} images across all breeds")
    print(f"🔄 Will process in chunks of {BATCH_SIZE} images")
    
    # Get breed distribution for reporting
    breed_counts = {}
    for image_path in image_files:
        filename = os.path.basename(image_path)
        breed, animal_type = get_breed_info(filename)
        breed_counts[breed] = breed_counts.get(breed, 0) + 1
    
    print(f"📊 Found {len(breed_counts)} unique breeds:")
    for breed, count in sorted(breed_counts.items()):
        print(f"   - {breed}: {count} images")
    
    uploaded_records = []
    failed_uploads = []
    
    for i, image_path in enumerate(image_files):
        filename = os.path.basename(image_path)
        print(f"📤 [{i+1}/{len(image_files)}] Processing {filename}...")
        
        try:
            # Get image metadata
            breed, animal_type = get_breed_info(filename)
            width, height = get_image_dimensions(image_path)
            file_size = os.path.getsize(image_path)
            
            # Upload to blob storage
            blob_url = upload_to_blob(image_path, filename)
            
            if blob_url:
                # Create database record
                record = {
                    'filename': filename,
                    'breed': breed,
                    'animal_type': animal_type,
                    'blob_url': blob_url,
                    'file_size': file_size,
                    'width': width,
                    'height': height,
                    'is_active': True
                }
                uploaded_records.append(record)
                print(f"✅ Uploaded {filename} -> {blob_url}")
            else:
                failed_uploads.append(filename)
                print(f"❌ Failed to upload {filename}")
        
        except Exception as e:
            print(f"❌ Error processing {filename}: {e}")
            failed_uploads.append(filename)
        
        # Insert to database in batches
        if len(uploaded_records) >= BATCH_SIZE:
            print(f"💾 Inserting batch of {len(uploaded_records)} records to database...")
            if insert_to_database(uploaded_records):
                uploaded_records = []  # Clear the batch
                print(f"📊 Progress: {i+1}/{len(image_files)} images processed ({((i+1)/len(image_files)*100):.1f}%)")
            else:
                print("❌ Database insertion failed, stopping...")
                break
        
        # Small delay to avoid rate limiting
        time.sleep(UPLOAD_DELAY)
    
    # Insert remaining records
    if uploaded_records:
        print(f"💾 Inserting final batch of {len(uploaded_records)} records...")
        insert_to_database(uploaded_records)
    
    # Summary
    print(f"\n📊 Upload Summary:")
    print(f"✅ Successfully processed: {len(image_files) - len(failed_uploads)}")
    print(f"❌ Failed uploads: {len(failed_uploads)}")
    
    if failed_uploads:
        print(f"\nFailed files: {failed_uploads[:10]}...")  # Show first 10 failures

if __name__ == "__main__":
    main()
