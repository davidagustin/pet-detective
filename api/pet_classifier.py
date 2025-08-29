import torch
import torch.nn as nn
import torch.optim as optim
import torchvision.transforms as transforms
import torchvision.models as models
from torch.utils.data import DataLoader, Dataset
from PIL import Image
import os
import numpy as np
from typing import List, Tuple, Dict
import requests
import io

class PetClassifier:
    def __init__(self, num_classes: int = 37, model_path: str = None, model_type: str = "resnet"):
        """
        Initialize the pet classifier with transfer learning
        
        Args:
            num_classes: Number of pet classes (default 37 for Oxford-IIIT dataset)
            model_path: Path to pre-trained model weights
            model_type: Type of model to use ("resnet", "alexnet", "mobilenet")
        """
        self.num_classes = num_classes
        self.model_type = model_type
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        
        # Define image transformations
        self.transform = transforms.Compose([
            transforms.Resize((224, 224)),
            transforms.ToTensor(),
            transforms.Normalize(mean=[0.485, 0.456, 0.406], 
                               std=[0.229, 0.224, 0.225])
        ])
        
        # Load pre-trained model
        self.model = self._create_model()
        
        if model_path and os.path.exists(model_path):
            self.load_model(model_path)
        
        self.model.to(self.device)
        self.model.eval()
        
        # Oxford-IIIT Pet Dataset classes
        self.class_names = [
            'Abyssinian', 'American Bulldog', 'American Pit Bull Terrier', 'Basset Hound',
            'Beagle', 'Bengal', 'Birman', 'Bombay', 'Boxer', 'British Shorthair',
            'Chihuahua', 'Egyptian Mau', 'English Cocker Spaniel', 'English Setter',
            'German Shorthaired', 'Great Pyrenees', 'Havanese', 'Japanese Chin',
            'Keeshond', 'Leonberger', 'Maine Coon', 'Miniature Pinscher', 'Newfoundland',
            'Persian', 'Pomeranian', 'Pug', 'Ragdoll', 'Russian Blue', 'Saint Bernard',
            'Samoyed', 'Scottish Terrier', 'Shih-Tzu', 'Siamese', 'Sphynx',
            'Staffordshire Bull Terrier', 'Wheaten Terrier', 'Yorkshire Terrier'
        ]
    
    def _create_model(self) -> nn.Module:
        """Create model with transfer learning based on model type"""
        if self.model_type == "resnet":
            # Load pre-trained ResNet-50
            model = models.resnet50(pretrained=True)
            
            # Freeze all layers except the final layer
            for param in model.parameters():
                param.requires_grad = False
            
            # Replace the final fully connected layer
            num_features = model.fc.in_features
            model.fc = nn.Sequential(
                nn.Dropout(0.5),
                nn.Linear(num_features, 512),
                nn.ReLU(),
                nn.Dropout(0.3),
                nn.Linear(512, self.num_classes)
            )
            
        elif self.model_type == "alexnet":
            # Load pre-trained AlexNet
            model = models.alexnet(pretrained=True)
            
            # Freeze all layers except the final layer
            for param in model.parameters():
                param.requires_grad = False
            
            # Replace the final classifier
            num_features = model.classifier[-1].in_features
            model.classifier[-1] = nn.Sequential(
                nn.Dropout(0.5),
                nn.Linear(num_features, 512),
                nn.ReLU(),
                nn.Dropout(0.3),
                nn.Linear(512, self.num_classes)
            )
            
        elif self.model_type == "mobilenet":
            # Load pre-trained MobileNet V2
            model = models.mobilenet_v2(pretrained=True)
            
            # Freeze all layers except the final layer
            for param in model.parameters():
                param.requires_grad = False
            
            # Replace the final classifier
            num_features = model.classifier[-1].in_features
            model.classifier[-1] = nn.Sequential(
                nn.Dropout(0.2),
                nn.Linear(num_features, 512),
                nn.ReLU(),
                nn.Dropout(0.2),
                nn.Linear(512, self.num_classes)
            )
            
        else:
            raise ValueError(f"Unsupported model type: {self.model_type}")
        
        return model
    
    def predict(self, image_path: str) -> Dict[str, float]:
        """
        Predict pet class from image
        
        Args:
            image_path: Path to image file or URL
            
        Returns:
            Dictionary with class predictions and probabilities
        """
        # Load and preprocess image
        if image_path.startswith('http'):
            response = requests.get(image_path)
            image = Image.open(io.BytesIO(response.content)).convert('RGB')
        else:
            image = Image.open(image_path).convert('RGB')
        
        # Apply transformations
        image_tensor = self.transform(image).unsqueeze(0).to(self.device)
        
        # Make prediction
        with torch.no_grad():
            outputs = self.model(image_tensor)
            probabilities = torch.softmax(outputs, dim=1)
            
        # Get top 5 predictions
        top_probs, top_indices = torch.topk(probabilities, 5)
        
        predictions = {}
        for i in range(5):
            class_name = self.class_names[top_indices[0][i].item()]
            probability = top_probs[0][i].item()
            predictions[class_name] = probability
        
        return predictions
    
    def save_model(self, path: str):
        """Save the trained model"""
        torch.save(self.model.state_dict(), path)
    
    def load_model(self, path: str):
        """Load a trained model"""
        self.model.load_state_dict(torch.load(path, map_location=self.device))
    
    def train(self, train_loader: DataLoader, val_loader: DataLoader, 
              epochs: int = 10, learning_rate: float = 0.001):
        """
        Train the model
        
        Args:
            train_loader: Training data loader
            val_loader: Validation data loader
            epochs: Number of training epochs
            learning_rate: Learning rate for optimization
        """
        criterion = nn.CrossEntropyLoss()
        optimizer = optim.Adam(self.model.fc.parameters(), lr=learning_rate)
        
        for epoch in range(epochs):
            # Training phase
            self.model.train()
            train_loss = 0.0
            for batch_idx, (data, target) in enumerate(train_loader):
                data, target = data.to(self.device), target.to(self.device)
                
                optimizer.zero_grad()
                output = self.model(data)
                loss = criterion(output, target)
                loss.backward()
                optimizer.step()
                
                train_loss += loss.item()
            
            # Validation phase
            self.model.eval()
            val_loss = 0.0
            correct = 0
            total = 0
            
            with torch.no_grad():
                for data, target in val_loader:
                    data, target = data.to(self.device), target.to(self.device)
                    output = self.model(data)
                    val_loss += criterion(output, target).item()
                    
                    _, predicted = torch.max(output.data, 1)
                    total += target.size(0)
                    correct += (predicted == target).sum().item()
            
            print(f'Epoch {epoch+1}/{epochs}:')
            print(f'Training Loss: {train_loss/len(train_loader):.4f}')
            print(f'Validation Loss: {val_loss/len(val_loader):.4f}')
            print(f'Validation Accuracy: {100*correct/total:.2f}%')
            print('-' * 50)

class PetDataset(Dataset):
    """Custom dataset for pet images"""
    
    def __init__(self, data_dir: str, transform=None):
        """
        Args:
            data_dir: Directory with pet images
            transform: Optional transform to be applied on images
        """
        self.data_dir = data_dir
        self.transform = transform
        self.images = []
        self.labels = []
        
        # Load image paths and labels
        self._load_data()
    
    def _load_data(self):
        """Load image paths and corresponding labels for Oxford-IIIT Pet dataset"""
        # Oxford-IIIT Pet dataset has images named as {breed}_{number}.jpg
        # We need to extract breed names and create a mapping
        breed_to_idx = {}
        idx = 0
        
        for filename in os.listdir(self.data_dir):
            if filename.endswith('.jpg'):
                # Extract breed name from filename (e.g., "Abyssinian_1.jpg" -> "Abyssinian")
                breed_name = filename.split('_')[0]
                
                if breed_name not in breed_to_idx:
                    breed_to_idx[breed_name] = idx
                    idx += 1
                
                self.images.append(os.path.join(self.data_dir, filename))
                self.labels.append(breed_to_idx[breed_name])
        
        print(f"Loaded {len(self.images)} images from {len(breed_to_idx)} breeds")
        print(f"Breeds found: {list(breed_to_idx.keys())}")
    
    def __len__(self):
        return len(self.images)
    
    def __getitem__(self, idx):
        img_path = self.images[idx]
        label = self.labels[idx]
        
        image = Image.open(img_path).convert('RGB')
        
        if self.transform:
            image = self.transform(image)
        
        return image, label
