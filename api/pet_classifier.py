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
import json
import logging

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Import SafeTensors support
try:
    from safetensors.torch import load_file as load_safetensors
    SAFETENSORS_AVAILABLE = True
except ImportError:
    SAFETENSORS_AVAILABLE = False
    logger.warning("SafeTensors not available. Install with: pip install safetensors")

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
    
    def save_model(self, path: str, format: str = "auto"):
        """
        Save the trained model
        
        Args:
            path: Path to save the model
            format: Format to save in ('pytorch', 'safetensors', 'auto')
        """
        file_ext = os.path.splitext(path)[1].lower()
        
        if format == "auto":
            if file_ext == '.safetensors':
                format = "safetensors"
            elif file_ext == '.pth':
                format = "pytorch"
            else:
                # Default to safetensors if available, otherwise pytorch
                format = "safetensors" if SAFETENSORS_AVAILABLE else "pytorch"
                if format == "safetensors" and not path.endswith('.safetensors'):
                    path = f"{os.path.splitext(path)[0]}.safetensors"
        
        if format == "safetensors":
            if not SAFETENSORS_AVAILABLE:
                raise ImportError("SafeTensors not available. Install with: pip install safetensors")
            
            from safetensors.torch import save_file
            logger.info(f"Saving model in SafeTensors format: {path}")
            save_file(self.model.state_dict(), path)
            
        elif format == "pytorch":
            logger.info(f"Saving model in PyTorch format: {path}")
            torch.save(self.model.state_dict(), path)
            
        else:
            raise ValueError(f"Unsupported format: {format}. Supported formats: 'pytorch', 'safetensors'")
        
        logger.info(f"Model saved successfully to: {path}")
    
    def load_model(self, path: str):
        """Load a trained model (supports both .pth and .safetensors formats)"""
        if not os.path.exists(path):
            raise FileNotFoundError(f"Model file not found: {path}")
        
        file_ext = os.path.splitext(path)[1].lower()
        
        if file_ext == '.safetensors':
            if not SAFETENSORS_AVAILABLE:
                raise ImportError("SafeTensors not available. Install with: pip install safetensors")
            
            logger.info(f"Loading SafeTensors model from: {path}")
            state_dict = load_safetensors(path)
            self.model.load_state_dict(state_dict)
            
        elif file_ext == '.pth':
            logger.info(f"Loading PyTorch model from: {path}")
            state_dict = torch.load(path, map_location=self.device)
            self.model.load_state_dict(state_dict)
            
        else:
            raise ValueError(f"Unsupported model format: {file_ext}. Supported formats: .pth, .safetensors")
        
        logger.info(f"Model loaded successfully from: {path}")
    
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

    def generate_game_question(self, game_mode: str = 'medium') -> dict:
        """
        Generate a game question using local images dynamically from the images folder
        
        Args:
            game_mode: Difficulty level ('easy', 'medium', 'hard')
            
        Returns:
            Dictionary containing game question data
        """
        import random
        import base64
        from PIL import Image
        import io
        import os
        
        # Load breed mapping from JSON file
        breed_mapping_path = os.path.join(os.path.dirname(__file__), 'breed_mapping.json')
        try:
            with open(breed_mapping_path, 'r') as f:
                breed_data = json.load(f)
                filename_to_breed = breed_data['filename_to_breed']
                breed_types = breed_data['breed_types']
        except FileNotFoundError:
            logger.warning("breed_mapping.json not found. Using fallback mapping.")
            filename_to_breed = {}
            breed_types = {'cats': [], 'dogs': []}
        
        # Dynamic image loading from images folder
        images_dir = 'images'
        available_images = {}
        
        # Scan the images directory for available pet images
        if os.path.exists(images_dir):
            for filename in os.listdir(images_dir):
                if filename.lower().endswith(('.jpg', '.jpeg', '.png', '.gif')):
                    # Extract breed name from filename (e.g., "abyssinian_1.jpg" -> "abyssinian")
                    # Handle both formats: "abyssinian_1.jpg" and "american_bulldog_1.jpg"
                    parts = filename.split('_')
                    if len(parts) >= 2:
                        # Check if it's a cat breed with underscore (like British_Shorthair_1.jpg)
                        if parts[0] in ['British', 'Egyptian', 'Maine', 'Russian']:
                            # Cat breeds with underscores: British_Shorthair_1.jpg -> British_Shorthair
                            breed_name = '_'.join(parts[:-1])
                        elif parts[0].islower():
                            # Dog breeds: american_bulldog_1.jpg -> american_bulldog
                            breed_name = '_'.join(parts[:-1])
                        else:
                            # Cat breeds: Abyssinian_1.jpg -> Abyssinian
                            breed_name = parts[0]
                    else:
                        breed_name = parts[0]
                    
                    # Map the breed name to the standardized class name
                    standardized_breed = filename_to_breed.get(breed_name, breed_name.title())
                    
                    if standardized_breed in self.class_names:
                        image_path = f'/images/{filename}'
                        if standardized_breed not in available_images:
                            available_images[standardized_breed] = []
                        available_images[standardized_breed].append(image_path)
        
        # If no images found in the folder, use fallback sample images
        if not available_images:
            logger.warning("No images found in images folder. Using fallback images.")
            available_images = {
                'Abyssinian': ['/images/Abyssinian_1.jpg'],
                'Beagle': ['/images/beagle_1.jpg'],
                'Bengal': ['/images/Bengal_1.jpg'],
                'Birman': ['/images/Birman_1.jpg'],
                'Boxer': ['/images/boxer_1.jpg'],
                'British Shorthair': ['/images/British_1.jpg'],
                'Chihuahua': ['/images/chihuahua_1.jpg'],
                'Egyptian Mau': ['/images/Egyptian_1.jpg'],
                'German Shorthaired': ['/images/german_1.jpg'],
                'Maine Coon': ['/images/Maine_1.jpg'],
                'Persian': ['/images/Persian_1.jpg'],
                'Pug': ['/images/pug_1.jpg'],
                'Ragdoll': ['/images/Ragdoll_1.jpg'],
                'Siamese': ['/images/Siamese_1.jpg'],
                'Yorkshire Terrier': ['/images/yorkshire_terrier_1.jpg']
            }
        
        # Select a random correct answer from available breeds
        available_breeds = list(available_images.keys())
        if not available_breeds:
            return {
                'error': 'No pet images available for the game'
            }
        
        # Ensure we have enough different breeds for the quiz
        if len(available_breeds) < 4:
            return {
                'error': f'Not enough different pet breeds available. Need at least 4, found {len(available_breeds)}'
            }
        
        correct_answer = random.choice(available_breeds)
        
        # Select a random image for the correct breed
        correct_image_path = random.choice(available_images[correct_answer])
        
        # Use breed types from JSON data
        cat_breeds = set(breed_types.get('cats', []))
        dog_breeds = set(breed_types.get('dogs', []))
        
        # Determine if correct answer is a cat or dog
        is_cat_question = correct_answer in cat_breeds
        is_dog_question = correct_answer in dog_breeds
        
        # Filter remaining breeds to same type (cat or dog)
        if is_cat_question:
            remaining_breeds = [breed for breed in remaining_breeds if breed in cat_breeds]
        elif is_dog_question:
            remaining_breeds = [breed for breed in remaining_breeds if breed in dog_breeds]
        else:
            # If breed type is unclear, use all remaining breeds
            pass
        
        # Ensure we have enough breeds of the same type
        if len(remaining_breeds) < 3:
            # If not enough same-type breeds, fall back to all breeds
            remaining_breeds = available_breeds.copy()
            remaining_breeds.remove(correct_answer)
        
        # Generate wrong options based on difficulty - ensure all are different breeds
        wrong_options = []
        
        if game_mode == 'easy':
            # Easy: 2 wrong options from different breeds
            num_wrong = min(2, len(remaining_breeds))
        elif game_mode == 'medium':
            # Medium: 3 wrong options from different breeds
            num_wrong = min(3, len(remaining_breeds))
        else:  # hard
            # Hard: 3 wrong options from different breeds
            num_wrong = min(3, len(remaining_breeds))
        
        # Select wrong options from different breeds of the same type
        wrong_options = random.sample(remaining_breeds, num_wrong)
        
        # Verify all options are different breeds
        all_options = [correct_answer] + wrong_options
        if len(set(all_options)) != len(all_options):
            return {
                'error': 'Failed to generate unique breed options for the quiz'
            }
        
        # Create options list with correct answer
        options = [correct_answer] + wrong_options
        random.shuffle(options)
        
        # Get AI prediction for the image
        try:
            # For now, we'll use a placeholder prediction
            # In a real implementation, you would load and predict the actual image
            ai_prediction = correct_answer  # Placeholder
            ai_confidence = random.uniform(0.7, 0.95)  # Placeholder confidence
        except Exception as e:
            logger.error(f"Error getting AI prediction: {e}")
            ai_prediction = correct_answer
            ai_confidence = 0.8
        
        return {
            'image': correct_image_path,
            'options': options,
            'correctAnswer': correct_answer,
            'aiPrediction': ai_prediction,
            'aiConfidence': round(ai_confidence, 2)
        }

    def get_available_models(self):
        """Get list of available models in the models directory"""
        available_models = []
        models_dir = 'models'
        
        if os.path.exists(models_dir):
            for filename in os.listdir(models_dir):
                if filename.endswith(('.pth', '.safetensors')):
                    filepath = os.path.join(models_dir, filename)
                    stat = os.stat(filepath)
                    
                    # Try to determine model type from filename
                    model_type = 'unknown'
                    if 'resnet' in filename.lower():
                        model_type = 'resnet'
                    elif 'alexnet' in filename.lower():
                        model_type = 'alexnet'
                    elif 'mobilenet' in filename.lower():
                        model_type = 'mobilenet'
                    
                    # Determine format
                    file_format = 'safetensors' if filename.endswith('.safetensors') else 'pytorch'
                    
                    available_models.append({
                        'name': filename,
                        'type': model_type,
                        'format': file_format,
                        'path': filepath,
                        'size_mb': round(stat.st_size / (1024 * 1024), 2),
                        'created': int(stat.st_ctime),
                        'modified': int(stat.st_mtime)
                    })
        
        return available_models


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
        
        logger.info(f"Loaded {len(self.images)} images from {len(breed_to_idx)} breeds")
        logger.info(f"Breeds found: {list(breed_to_idx.keys())}")
    
    def __len__(self):
        return len(self.images)
    
    def __getitem__(self, idx):
        img_path = self.images[idx]
        label = self.labels[idx]
        
        image = Image.open(img_path).convert('RGB')
        
        if self.transform:
            image = self.transform(image)
        
        return image, label
