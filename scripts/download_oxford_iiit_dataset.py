#!/usr/bin/env python3
"""
Download and prepare Oxford-IIIT Pet Dataset for segmentation training
"""

import os
import requests
import zipfile
import tarfile
from tqdm import tqdm
import shutil

def download_file(url, filename):
    """Download file with progress bar"""
    response = requests.get(url, stream=True)
    total_size = int(response.headers.get('content-length', 0))
    
    with open(filename, 'wb') as file, tqdm(
        desc=filename,
        total=total_size,
        unit='iB',
        unit_scale=True,
        unit_divisor=1024,
    ) as pbar:
        for data in response.iter_content(chunk_size=1024):
            size = file.write(data)
            pbar.update(size)

def extract_archive(archive_path, extract_to):
    """Extract archive file"""
    print(f"Extracting {archive_path}...")
    
    if archive_path.endswith('.zip'):
        with zipfile.ZipFile(archive_path, 'r') as zip_ref:
            zip_ref.extractall(extract_to)
    elif archive_path.endswith('.tar.gz'):
        with tarfile.open(archive_path, 'r:gz') as tar_ref:
            tar_ref.extractall(extract_to)
    else:
        raise ValueError(f"Unsupported archive format: {archive_path}")

def setup_oxford_iiit_dataset():
    """Download and setup Oxford-IIIT Pet Dataset"""
    
    # Dataset URLs
    images_url = "https://www.robots.ox.ac.uk/~vgg/data/pets/data/images.tar.gz"
    annotations_url = "https://www.robots.ox.ac.uk/~vgg/data/pets/data/annotations.tar.gz"
    
    # Local paths
    dataset_dir = "oxford-iiit-pet"
    images_archive = "images.tar.gz"
    annotations_archive = "annotations.tar.gz"
    
    # Create dataset directory
    os.makedirs(dataset_dir, exist_ok=True)
    
    print("Downloading Oxford-IIIT Pet Dataset...")
    print("This may take a while depending on your internet connection.")
    
    # Download images
    if not os.path.exists(images_archive):
        print("Downloading images...")
        download_file(images_url, images_archive)
    else:
        print("Images archive already exists, skipping download.")
    
    # Download annotations
    if not os.path.exists(annotations_archive):
        print("Downloading annotations...")
        download_file(annotations_url, annotations_archive)
    else:
        print("Annotations archive already exists, skipping download.")
    
    # Extract archives
    print("Extracting archives...")
    extract_archive(images_archive, dataset_dir)
    extract_archive(annotations_archive, dataset_dir)
    
    # Clean up downloaded archives
    print("Cleaning up...")
    if os.path.exists(images_archive):
        os.remove(images_archive)
    if os.path.exists(annotations_archive):
        os.remove(annotations_archive)
    
    # Verify dataset structure
    images_dir = os.path.join(dataset_dir, "images")
    annotations_dir = os.path.join(dataset_dir, "annotations")
    trimaps_dir = os.path.join(annotations_dir, "trimaps")
    
    if not os.path.exists(images_dir):
        raise RuntimeError("Images directory not found after extraction")
    if not os.path.exists(trimaps_dir):
        raise RuntimeError("Trimaps directory not found after extraction")
    
    # Count files
    image_files = [f for f in os.listdir(images_dir) if f.endswith('.jpg')]
    mask_files = [f for f in os.listdir(trimaps_dir) if f.endswith('.png')]
    
    print(f"Dataset setup complete!")
    print(f"Found {len(image_files)} images and {len(mask_files)} masks")
    print(f"Dataset location: {os.path.abspath(dataset_dir)}")
    
    # Create a sample visualization
    create_sample_visualization(dataset_dir)

def create_sample_visualization(dataset_dir):
    """Create a sample visualization of the dataset"""
    try:
        import matplotlib.pyplot as plt
        from PIL import Image
        import random
        
        images_dir = os.path.join(dataset_dir, "images")
        trimaps_dir = os.path.join(dataset_dir, "annotations", "trimaps")
        
        # Get sample files
        image_files = [f for f in os.listdir(images_dir) if f.endswith('.jpg')]
        if not image_files:
            return
        
        sample_image = random.choice(image_files)
        sample_mask = sample_image.replace('.jpg', '.png')
        
        # Load sample
        img_path = os.path.join(images_dir, sample_image)
        mask_path = os.path.join(trimaps_dir, sample_mask)
        
        if not os.path.exists(mask_path):
            return
        
        # Create visualization
        fig, axes = plt.subplots(1, 3, figsize=(15, 5))
        
        # Original image
        img = Image.open(img_path)
        axes[0].imshow(img)
        axes[0].set_title('Original Image')
        axes[0].axis('off')
        
        # Mask
        mask = Image.open(mask_path)
        axes[1].imshow(mask, cmap='gray')
        axes[1].set_title('Segmentation Mask')
        axes[1].axis('off')
        
        # Overlay
        img_array = np.array(img)
        mask_array = np.array(mask)
        
        # Create overlay (mask values: 1=foreground, 2=background, 3=boundary)
        overlay = img_array.copy()
        overlay[mask_array == 1] = [255, 0, 0]  # Red for foreground
        overlay[mask_array == 2] = [0, 0, 255]  # Blue for background
        
        axes[2].imshow(overlay)
        axes[2].set_title('Overlay')
        axes[2].axis('off')
        
        plt.tight_layout()
        plt.savefig('dataset_sample.png', dpi=150, bbox_inches='tight')
        plt.close()
        
        print("Sample visualization saved as 'dataset_sample.png'")
        
    except ImportError:
        print("Matplotlib not available, skipping visualization")
    except Exception as e:
        print(f"Could not create visualization: {e}")

if __name__ == "__main__":
    setup_oxford_iiit_dataset()
