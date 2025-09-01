import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import Dataset, DataLoader
from torchvision import transforms
from PIL import Image
import numpy as np
import os
import json
import time
from tqdm import tqdm
import matplotlib.pyplot as plt
from pet_segmentation import UNet

class OxfordIIITDataset(Dataset):
    """Oxford-IIIT Pet Dataset for segmentation training"""
    
    def __init__(self, data_dir, split='train', transform=None, target_transform=None):
        self.data_dir = data_dir
        self.split = split
        self.transform = transform
        self.target_transform = target_transform
        
        # Load dataset annotations
        self.images_dir = os.path.join(data_dir, 'images')
        self.masks_dir = os.path.join(data_dir, 'annotations', 'trimaps')
        
        # Get list of image files
        self.image_files = []
        for filename in os.listdir(self.images_dir):
            if filename.endswith('.jpg'):
                # Check if corresponding mask exists
                mask_filename = filename.replace('.jpg', '.png')
                mask_path = os.path.join(self.masks_dir, mask_filename)
                if os.path.exists(mask_path):
                    self.image_files.append(filename)
        
        # Split dataset (80% train, 20% val)
        if split == 'train':
            self.image_files = self.image_files[:int(0.8 * len(self.image_files))]
        else:
            self.image_files = self.image_files[int(0.8 * len(self.image_files)):]
        
        print(f"Loaded {len(self.image_files)} images for {split} split")
    
    def __len__(self):
        return len(self.image_files)
    
    def __getitem__(self, idx):
        # Load image
        img_filename = self.image_files[idx]
        img_path = os.path.join(self.images_dir, img_filename)
        image = Image.open(img_path).convert('RGB')
        
        # Load mask
        mask_filename = img_filename.replace('.jpg', '.png')
        mask_path = os.path.join(self.masks_dir, mask_filename)
        mask = Image.open(mask_path).convert('L')
        
        # Apply transforms
        if self.transform:
            image = self.transform(image)
        if self.target_transform:
            mask = self.target_transform(mask)
        
        return image, mask

def dice_loss(pred, target, smooth=1e-6):
    """Dice loss for segmentation"""
    pred = torch.sigmoid(pred)
    pred_flat = pred.view(-1)
    target_flat = target.view(-1)
    
    intersection = (pred_flat * target_flat).sum()
    dice = (2. * intersection + smooth) / (pred_flat.sum() + target_flat.sum() + smooth)
    return 1 - dice

def train_segmentation_model(data_dir, model_save_path, epochs=50, batch_size=8, learning_rate=1e-4):
    """Train segmentation model on Oxford-IIIT dataset"""
    
    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    print(f"Using device: {device}")
    
    # Data transforms
    transform = transforms.Compose([
        transforms.Resize((256, 256)),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
    ])
    
    target_transform = transforms.Compose([
        transforms.Resize((256, 256)),
        transforms.ToTensor(),
    ])
    
    # Create datasets
    train_dataset = OxfordIIITDataset(data_dir, 'train', transform, target_transform)
    val_dataset = OxfordIIITDataset(data_dir, 'val', transform, target_transform)
    
    # Create data loaders
    train_loader = DataLoader(train_dataset, batch_size=batch_size, shuffle=True, num_workers=4)
    val_loader = DataLoader(val_dataset, batch_size=batch_size, shuffle=False, num_workers=4)
    
    # Initialize model
    model = UNet(n_channels=3, n_classes=1, bilinear=True)
    model.to(device)
    
    # Loss function and optimizer
    criterion = dice_loss
    optimizer = optim.Adam(model.parameters(), lr=learning_rate)
    scheduler = optim.lr_scheduler.ReduceLROnPlateau(optimizer, mode='min', patience=5, factor=0.5)
    
    # Training history
    train_losses = []
    val_losses = []
    best_val_loss = float('inf')
    
    print(f"Starting training for {epochs} epochs...")
    
    for epoch in range(epochs):
        # Training phase
        model.train()
        train_loss = 0.0
        
        train_pbar = tqdm(train_loader, desc=f'Epoch {epoch+1}/{epochs} [Train]')
        for batch_idx, (images, masks) in enumerate(train_pbar):
            images = images.to(device)
            masks = masks.to(device)
            
            optimizer.zero_grad()
            outputs = model(images)
            loss = criterion(outputs, masks)
            loss.backward()
            optimizer.step()
            
            train_loss += loss.item()
            train_pbar.set_postfix({'Loss': f'{loss.item():.4f}'})
        
        train_loss /= len(train_loader)
        train_losses.append(train_loss)
        
        # Validation phase
        model.eval()
        val_loss = 0.0
        
        with torch.no_grad():
            val_pbar = tqdm(val_loader, desc=f'Epoch {epoch+1}/{epochs} [Val]')
            for images, masks in val_pbar:
                images = images.to(device)
                masks = masks.to(device)
                
                outputs = model(images)
                loss = criterion(outputs, masks)
                val_loss += loss.item()
                
                val_pbar.set_postfix({'Loss': f'{loss.item():.4f}'})
        
        val_loss /= len(val_loader)
        val_losses.append(val_loss)
        
        # Learning rate scheduling
        scheduler.step(val_loss)
        
        # Save best model
        if val_loss < best_val_loss:
            best_val_loss = val_loss
            torch.save(model.state_dict(), model_save_path)
            print(f"Saved best model with validation loss: {val_loss:.4f}")
        
        print(f'Epoch {epoch+1}/{epochs}: Train Loss: {train_loss:.4f}, Val Loss: {val_loss:.4f}')
    
    # Plot training history
    plt.figure(figsize=(10, 5))
    plt.plot(train_losses, label='Training Loss')
    plt.plot(val_losses, label='Validation Loss')
    plt.xlabel('Epoch')
    plt.ylabel('Loss')
    plt.title('Training History')
    plt.legend()
    plt.savefig('training_history.png')
    plt.close()
    
    print(f"Training completed! Best validation loss: {best_val_loss:.4f}")
    return model

def evaluate_model(model, data_dir, batch_size=8):
    """Evaluate trained model on test set"""
    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    model.to(device)
    model.eval()
    
    # Data transforms
    transform = transforms.Compose([
        transforms.Resize((256, 256)),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
    ])
    
    target_transform = transforms.Compose([
        transforms.Resize((256, 256)),
        transforms.ToTensor(),
    ])
    
    # Create test dataset
    test_dataset = OxfordIIITDataset(data_dir, 'val', transform, target_transform)
    test_loader = DataLoader(test_dataset, batch_size=batch_size, shuffle=False)
    
    total_dice = 0.0
    num_samples = 0
    
    with torch.no_grad():
        for images, masks in tqdm(test_loader, desc='Evaluating'):
            images = images.to(device)
            masks = masks.to(device)
            
            outputs = model(images)
            pred_masks = torch.sigmoid(outputs) > 0.5
            
            # Calculate Dice coefficient
            for i in range(images.size(0)):
                pred_flat = pred_masks[i].view(-1).float()
                target_flat = masks[i].view(-1).float()
                
                intersection = (pred_flat * target_flat).sum()
                dice = (2. * intersection) / (pred_flat.sum() + target_flat.sum() + 1e-6)
                total_dice += dice.item()
                num_samples += 1
    
    avg_dice = total_dice / num_samples
    print(f"Average Dice Coefficient: {avg_dice:.4f}")
    return avg_dice

if __name__ == "__main__":
    # Configuration
    DATA_DIR = "oxford-iiit-pet"  # Path to Oxford-IIIT dataset
    MODEL_SAVE_PATH = "models/pet_segmentation_model.pth"
    
    # Create models directory if it doesn't exist
    os.makedirs("models", exist_ok=True)
    
    # Check if dataset exists
    if not os.path.exists(DATA_DIR):
        print(f"Dataset not found at {DATA_DIR}")
        print("Please download the Oxford-IIIT Pet Dataset and extract it to this directory")
        print("Download from: https://www.robots.ox.ac.uk/~vgg/data/pets/")
        exit(1)
    
    # Train model
    print("Starting segmentation model training...")
    model = train_segmentation_model(
        data_dir=DATA_DIR,
        model_save_path=MODEL_SAVE_PATH,
        epochs=50,
        batch_size=8,
        learning_rate=1e-4
    )
    
    # Evaluate model
    print("Evaluating trained model...")
    dice_score = evaluate_model(model, DATA_DIR)
    
    print(f"Training completed successfully!")
    print(f"Model saved to: {MODEL_SAVE_PATH}")
    print(f"Final Dice Score: {dice_score:.4f}")
